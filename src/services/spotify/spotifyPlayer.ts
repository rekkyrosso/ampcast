import {from, Observable} from 'rxjs';
import {EMPTY, BehaviorSubject, Subject, interval, merge, of} from 'rxjs';
import {
    catchError,
    delay,
    delayWhen,
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
                mergeMap(() => this.observeIsLoggedIn()),
                switchMap((isLoggedIn) => (isLoggedIn ? this.observeSrc() : EMPTY)),
                withLatestFrom(this.observeAccessToken()),
                // mergeMap(([src, token]) => this.setVolume(0).then(() => [src, token])),
                switchMap(([src, token]) => {
                    if (src && src !== this.loadedSrc) {
                        return this.observeNotLoading().pipe(
                            delayWhen(() => (this.loadError ? this.reconnect() : of(0))),
                            mergeMap(() => this.addToQueue(src, token)),
                            mergeMap(() =>
                                this.observeState().pipe(
                                    map((state) => state.track_window.current_track.uri),
                                    skipWhile((src) => src === this.currentTrackSrc),
                                    tap((src) => (this.currentTrackSrc = src)),
                                    take(1)
                                )
                            ),
                            // mergeMap(() => this.setVolume(this.muted ? 0 : this.volume)),
                            catchError((error) => {
                                this.loadedSrc = '';
                                this.currentTrackSrc = '';
                                this.loadError = {src, error, timeStamp: Date.now()};
                                this.error$.next(error);
                                return EMPTY;
                            }),
                            tap(logger.all('step5')),
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
                    if (this.paused && !state.paused) {
                        this.player!.pause().then(undefined, logger.error);
                    } else if (
                        state.paused &&
                        !this.paused &&
                        state.track_window.current_track.uri === this.currentTrackSrc
                    ) {
                        this.player!.resume().then(undefined, (err) => this.error$.next(err));
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
            this.setVolume(muted ? 0 : this.volume);
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        if (this.#volume !== volume) {
            this.#volume = volume;
            this.setVolume(this.muted ? 0 : volume);
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
        return this.observeSrc().pipe(
            switchMap((src) =>
                src
                    ? this.observeCurrentTrackState().pipe(
                          map((track) => track.duration / 1000),
                          take(1)
                      )
                    : of(0)
            )
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
            filter((playing) => playing),
            map(() => undefined)
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
                    this.player.resume().then(undefined, (err) => this.error$.next(err));
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
                this.player.resume().then(undefined, (err) => this.error$.next(err));
            }
        } else {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    pause(): void {
        this.paused$.next(true);
        if (this.loadedSrc) {
            this.player?.pause();
        }
    }

    stop(): void {
        this.paused$.next(true);
        if (this.loadedSrc) {
            this.player?.seek(0).then(() => this.player!.pause());
        }
    }

    seek(time: number): void {
        this.player?.seek(time * 1000);
    }

    resize(): void {
        // not visible
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

    private observeCurrentTrackState(): Observable<Spotify.PlaybackState> {
        return this.observeState().pipe(
            filter((state) => state.track_window.current_track.uri === this.currentTrackSrc),
            map((state) => state)
        );
    }

    private getCurrentState(): Promise<Spotify.PlaybackState | null> {
        return this.player ? this.player.getCurrentState() : Promise.resolve(null);
    }

    private onSpotifyWebPlaybackSDKReady = () => {
        logger.log('onSpotifyWebPlaybackSDKReady');
        this.observeAccessToken()
            .pipe(
                filter((token) => token !== ''),
                tap((token) => {
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

                    player.addListener('initialization_error', logger.error);
                    player.addListener('authentication_error', logger.error);
                    player.addListener('account_error', logger.error);
                    player.addListener('playback_error', (err) => this.error$.next(err));
                    player.addListener('player_state_changed', (state) => this.state$.next(state));

                    player.addListener('not_ready', () => {
                        logger.log('not_ready');
                        this.deviceId = '';
                    });

                    player.addListener('ready', ({device_id}) => {
                        logger.log('ready');
                        this.player = player;
                        this.deviceId = device_id;
                        this.ready$.next(undefined);
                    });

                    player.connect();
                }),
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
            if (response.status === 401 && retryCount > 0) {
                const newToken = await refreshToken();
                return this.addToQueue(src, newToken, --retryCount);
            }
            throw response;
        }

        this.loadError = undefined;
        this.loadedSrc = src;
    }

    private reconnect(): Observable<void> {
        return from(Promise.resolve().then(() => this.player!.disconnect())).pipe(
            delay(1000),
            mergeMap(() => this.player!.connect()),
            delay(1000),
            tap(() => (this.loadError = undefined)),
            map(() => undefined)
        );
    }

    private setVolume(volume: number): Promise<void> {
        return this.player
            ? this.player!.setVolume(volume).then(undefined, logger.error)
            : Promise.resolve();
    }
}

export default new SpotifyPlayer(observeAccessToken());
