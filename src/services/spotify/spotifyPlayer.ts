import type {Observable} from 'rxjs';
import {EMPTY, BehaviorSubject, Subject, firstValueFrom, from, interval, merge, of} from 'rxjs';
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
    private readonly ready$ = new Subject<void>();
    private readonly state$ = new BehaviorSubject<Spotify.PlaybackState | null>(null);
    private loadedSrc = '';
    private currentTrackSrc = ''; // https://developer.spotify.com/documentation/general/guides/track-relinking-guide/
    private loadError?: LoadError;
    private isLoggedIn = false;
    private deviceId = '';
    private hasPlayed = false;
    public autoplay = false;
    public hidden = true;
    public loop = false;
    #muted = true;
    #volume = 1;

    constructor(private readonly accessToken$: Observable<string>) {
        window.onSpotifyWebPlaybackSDKReady = this.onSpotifyWebPlaybackSDKReady;

        // Load new tracks.
        this.observeReady()
            .pipe(
                switchMap(() => this.observeIsLoggedIn()),
                switchMap((isLoggedIn) => (isLoggedIn ? this.observeSrc() : EMPTY)),
                withLatestFrom(this.observeAccessToken()),
                switchMap(([src, token]) => {
                    if (src && src !== this.loadedSrc) {
                        return this.observeNotLoading().pipe(
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
                    const isCurrentTrack =
                        state.track_window.current_track?.uri === this.currentTrackSrc;
                    if ((this.paused && !state.paused) || !isCurrentTrack) {
                        this.safePause();
                    } else if (
                        (state.paused || !this.hasPlayed) &&
                        !this.paused &&
                        isCurrentTrack
                    ) {
                        this.safePlay();
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
        return this.observeCurrentTrackState().pipe(
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
        this.paused$.next(true);
        this.safePause();
    }

    stop(): void {
        this.paused$.next(true);
        if (this.loadedSrc) {
            this.player?.seek(0).then(() => this.safePause(), logger.error);
        }
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

    private observeNotLoading(): Observable<void> {
        return this.state$.pipe(
            map((state) => state?.loading !== true),
            distinctUntilChanged(),
            map(() => undefined)
        );
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeReady(): Observable<void> {
        return this.ready$.pipe(take(1));
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
                tap(() => this.ready$.next(undefined)),
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
            delay(1000),
            map(() => undefined)
        );
        return firstValueFrom(reconnect$);
    }

    private safePause(): Promise<void> {
        return this.player && this.loadedSrc
            ? this.player.pause().then(undefined, logger.error)
            : Promise.resolve();
    }

    private safePlay(): Promise<void> {
        return this.player
            ? this.player.resume().then(
                  () => {
                      this.hasPlayed = true;
                  },
                  (err) => this.error$.next(err)
              )
            : Promise.resolve();
    }

    private safeVolume(volume: number): Promise<void> {
        return this.player
            ? this.player.setVolume(volume).then(undefined, logger.error)
            : Promise.resolve();
    }
}

export default new SpotifyPlayer(observeAccessToken());
