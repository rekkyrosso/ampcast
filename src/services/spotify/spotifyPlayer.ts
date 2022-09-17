import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    combineLatest,
    firstValueFrom,
    from,
    interval,
    merge,
    of,
} from 'rxjs';
import {
    catchError,
    delay,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    skipWhile,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from 'rxjs/operators';
import Player from 'types/Player';
import {exists, loadScript, Logger} from 'utils';
import {observeAccessToken, refreshToken} from './spotifyAuth';

interface LoadError {
    readonly src: string;
    readonly error: unknown;
    readonly timeStamp: number;
}

const logger = new Logger('SpotifyPlayer');

const spotifyApi = 'https://api.spotify.com/v1';
const spotifyPlayerSdk = 'https://sdk.scdn.co/spotify-player.js';

const ERR_NOT_CONNECTED = 'Spotify player not connected.';

const comparePausedAndPosition = (a: Spotify.PlaybackState, b: Spotify.PlaybackState): boolean =>
    a.paused === b.paused && a.position === b.position;

export class SpotifyPlayer implements Player<string> {
    private player: Spotify.Player | null = null;
    private readonly paused$ = new BehaviorSubject(true);
    private readonly src$ = new BehaviorSubject('');
    private readonly error$ = new Subject<unknown>();
    private readonly playerReady$ = new BehaviorSubject(false);
    private readonly playerStarted$ = new BehaviorSubject(false);
    private readonly state$ = new BehaviorSubject<Spotify.PlaybackState | null>(null);
    private loadedSrc = '';
    private currentTrackSrc = ''; // https://developer.spotify.com/documentation/general/guides/track-relinking-guide/
    private loadError?: LoadError;
    private isLoggedIn = false;
    private deviceId = '';
    public hidden = true;
    public loop = false;
    #autoplay = false;
    #muted = true;
    #volume = 1;

    constructor(private readonly accessToken$: Observable<string>) {
        window.onSpotifyWebPlaybackSDKReady = this.onSpotifyWebPlaybackSDKReady;

        this.observeReady()
            .pipe(
                tap(() => this.player!.activateElement()),
                take(1)
            )
            .subscribe(logger);

        // Load new tracks.
        this.observeReady()
            .pipe(
                switchMap(() => this.observeIsLoggedIn()),
                switchMap((isLoggedIn) => (isLoggedIn ? this.observePaused() : EMPTY)),
                switchMap((paused) => (paused ? EMPTY : this.observeSrc())),
                withLatestFrom(this.observeAccessToken()),
                switchMap(([src, token]) => {
                    if (src && src !== this.loadedSrc) {
                        return of(undefined).pipe(
                            mergeMap(() =>
                                this.loadError ? this.reconnect(token) : of(undefined)
                            ),
                            mergeMap(() => this.addToQueue(src, token)),
                            catchError((error) => {
                                this.loadedSrc = '';
                                this.currentTrackSrc = '';
                                this.loadError = {src, error, timeStamp: Date.now()};
                                this.error$.next(error);
                                return EMPTY;
                            }),
                            take(1)
                        );
                    } else {
                        return EMPTY;
                    }
                })
            )
            .subscribe(logger);

        // Synchronize player states.
        this.observeState()
            .pipe(
                tap((state) => {
                    if (this.src === this.loadedSrc && state.track_window.current_track) {
                        this.currentTrackSrc = state.track_window.current_track.uri;
                    }
                })
            )
            .subscribe(logger);

        this.observeIsLoggedIn()
            .pipe(
                skipWhile((isLoggedIn) => isLoggedIn === this.isLoggedIn),
                tap((isLoggedIn) => {
                    this.isLoggedIn = isLoggedIn;
                    if (!isLoggedIn && !this.paused) {
                        this.stop();
                        this.error$.next(Error(ERR_NOT_CONNECTED));
                    }
                })
            )
            .subscribe(logger);

        this.observeError().subscribe(logger.error);

        loadScript(spotifyPlayerSdk);
    }

    get autoplay(): boolean {
        return this.#autoplay;
    }

    set autoplay(autoplay: boolean) {
        if (this.#autoplay !== autoplay) {
            this.#autoplay = autoplay;
            if (autoplay) {
                this.playerStarted$.next(true);
            }
        }
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        if (this.#muted !== muted) {
            this.#muted = muted;
            this.safeVolume(muted ? 0 : this.volume);
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        if (this.#volume !== volume) {
            this.#volume = volume;
            this.safeVolume(this.muted ? 0 : volume);
        }
    }

    observeCurrentTime(): Observable<number> {
        return merge(
            this.observeCurrentTrackState(),
            this.observePaused().pipe(
                switchMap((paused) =>
                    paused
                        ? this.getCurrentState()
                        : interval(250).pipe(mergeMap(() => this.getCurrentState()))
                )
            )
        ).pipe(
            map((state) => (state ? state.position / 1000 : 0)),
            distinctUntilChanged()
        );
    }

    observeDuration(): Observable<number> {
        return this.observeCurrentTrackState().pipe(
            map((track) => track.duration / 1000),
            distinctUntilChanged()
        );
    }

    observeEnded(): Observable<void> {
        return this.observePlaying().pipe(
            switchMap(() => this.observeCurrentTrackState()),
            distinctUntilChanged(comparePausedAndPosition),
            withLatestFrom(this.observePaused()),
            map(([state, paused]) => !paused && state.paused && state.position === 0),
            filter((ended) => ended),
            map(() => undefined)
        );
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentTrackState().pipe(
            distinctUntilChanged(comparePausedAndPosition),
            withLatestFrom(this.observePaused()),
            map(([state, paused]) => !paused && !state.paused),
            distinctUntilChanged(),
            filter((playing) => playing),
            map(() => undefined)
        );
    }

    observeCurrentTrackState(): Observable<Spotify.PlaybackState> {
        return this.observeState().pipe(
            filter((state) => state.track_window?.current_track?.uri === this.currentTrackSrc),
            map((state) => state)
        );
    }

    appendTo(): void {
        // not visible
    }

    load(src: string): void {
        logger.log('load');
        this.src$.next(src);
        if (this.player && this.isLoggedIn) {
            if (this.autoplay) {
                this.paused$.next(false);
                if (src === this.loadedSrc) {
                    this.safePlay();
                }
            }
        } else if (this.autoplay) {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    play(): void {
        logger.log('play');
        this.paused$.next(false);
        if (this.player && this.isLoggedIn) {
            if (this.src === this.loadError?.src) {
                this.error$.next(this.loadError.error);
            } else if (this.src === this.loadedSrc) {
                this.safePlay();
            }
        } else {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    pause(): void {
        logger.log('pause');
        this.paused$.next(true);
        this.safePause();
    }

    stop(): void {
        logger.log('stop');
        this.paused$.next(true);
        this.safeStop();
    }

    seek(time: number): void {
        this.player?.seek(time * 1000);
    }

    resize(): void {
        // not visible
    }

    getCurrentState(): Promise<Spotify.PlaybackState | null> {
        return this.player ? this.player.getCurrentState() : Promise.resolve(null);
    }

    private get paused(): boolean {
        return this.paused$.getValue();
    }

    private get src(): string {
        return this.src$.getValue();
    }

    private observeAccessToken(): Observable<string> {
        return this.accessToken$;
    }

    private observeIsLoggedIn(): Observable<boolean> {
        return this.observeAccessToken().pipe(
            map((accessToken) => !!accessToken),
            distinctUntilChanged()
        );
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeReady(): Observable<void> {
        return combineLatest([this.playerReady$, this.playerStarted$]).pipe(
            filter(([ready, started]) => ready && started),
            map(() => undefined),
            take(1)
        );
    }

    private observeSrc(): Observable<string> {
        return this.src$.pipe(distinctUntilChanged());
    }

    private observeState(): Observable<Spotify.PlaybackState> {
        return this.state$.pipe(filter(exists));
    }

    private onSpotifyWebPlaybackSDKReady = () => {
        logger.log('onSpotifyWebPlaybackSDKReady');
        this.observeAccessToken()
            .pipe(
                filter((token) => token !== ''),
                mergeMap((token) => this.connect(token)),
                tap(() => this.playerReady$.next(true)),
                take(1)
            )
            .subscribe(logger);
    };

    private async addToQueue(src: string, token: string, retryCount = 3): Promise<void> {
        if (!token) {
            throw Error(ERR_NOT_CONNECTED);
        }

        const response = await fetch(`${spotifyApi}/me/player/play?device_id=${this.deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({uris: [src], position_ms: 0}),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (retryCount > 0) {
                switch (response.status) {
                    case 401: {
                        const token = await refreshToken();
                        return this.addToQueue(src, token, --retryCount);
                    }

                    case 404:
                    case 502: {
                        await this.reconnect(token);
                        return this.addToQueue(src, token, --retryCount);
                    }
                }
            }
            throw response;
        }

        this.loadError = undefined;
        this.loadedSrc = src;
    }

    private async connect(token: string): Promise<Spotify.Player> {
        return new Promise((resolve, reject) => {
            let tokenRefreshRequired = false;

            const player = new Spotify.Player({
                name: __app_name__,
                getOAuthToken: async (callback) => {
                    if (tokenRefreshRequired) {
                        token = await refreshToken();
                    }
                    tokenRefreshRequired = true;
                    callback(token);
                },
                volume: this.muted ? 0 : this.volume,
            });

            player.addListener('initialization_error', reject);
            player.addListener('authentication_error', reject);
            player.addListener('account_error', reject);
            player.addListener('playback_error', (err) => this.error$.next(err));
            player.addListener('player_state_changed', (state) => this.state$.next(state));

            player.addListener('not_ready', () => {
                logger.log('not_ready');
                this.deviceId = '';
                reject('not_ready');
            });

            player.addListener('ready', ({device_id}) => {
                logger.log('ready');
                this.player = player;
                this.deviceId = device_id;
                resolve(player);
            });

            player.connect();
        });
    }

    private async disconnect(): Promise<void> {
        this.loadedSrc = '';
        this.currentTrackSrc = '';
        this.loadError = undefined;
        const player = this.player;
        if (player) {
            player.removeListener('initialization_error');
            player.removeListener('authentication_error');
            player.removeListener('account_error');
            player.removeListener('playback_error');
            player.removeListener('player_state_changed');
            player.removeListener('not_ready');
            player.removeListener('ready');
            return this.safePause().then(() => player.disconnect());
        } else {
            return Promise.resolve();
        }
    }

    private async reconnect(token: string): Promise<void> {
        logger.log('reconnect');
        const reconnect$ = from(this.disconnect()).pipe(
            delay(1000), // TODO: remove/reduce?
            mergeMap(() => this.connect(token)),
            delay(3000),
            map(() => undefined)
        );
        return firstValueFrom(reconnect$);
    }

    private async safePause(): Promise<void> {
        try {
            if (this.player && this.loadedSrc) {
                await this.player.pause();
            }
        } catch (err) {
            logger.error(err);
        }
    }

    private async safePlay(): Promise<void> {
        try {
            if (this.player && this.loadedSrc) {
                await this.player.resume();
            }
        } catch (err) {
            this.error$.next(err);
        }
    }

    private async safeStop(): Promise<void> {
        try {
            if (this.player && this.loadedSrc) {
                await this.player.pause();
                const state = await this.getCurrentState();
                if (state?.position) {
                    await this.player.seek(0);
                }
            }
        } catch (err) {
            logger.error(err);
        }
    }

    private async safeVolume(volume: number): Promise<void> {
        try {
            await this.player?.setVolume(volume);
        } catch (err) {
            logger.error(err);
        }
    }
}

export default new SpotifyPlayer(observeAccessToken());
