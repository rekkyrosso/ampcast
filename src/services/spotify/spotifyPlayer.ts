import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    concatMap,
    delay,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    from,
    interval,
    map,
    merge,
    mergeMap,
    of,
    race,
    skipWhile,
    switchMap,
    take,
    tap,
    timer,
    withLatestFrom,
} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {exists, loadScript, Logger, sleep} from 'utils';
import {observeAccessToken, refreshToken} from './spotifyAuth';

interface LoadError {
    readonly src: string;
    readonly error: unknown;
}

const logger = new Logger('SpotifyPlayer');

const spotifyApi = 'https://api.spotify.com/v1';
const spotifyPlayerSdk = 'https://sdk.scdn.co/spotify-player.js';

const comparePausedAndPosition = (a: Spotify.PlaybackState, b: Spotify.PlaybackState): boolean =>
    a.paused === b.paused && a.position === b.position;

export class SpotifyPlayer implements Player<PlayableItem> {
    private player: Spotify.Player | null = null;
    private readonly paused$ = new BehaviorSubject(true);
    private readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly currentTrackSrc$ = new BehaviorSubject(''); // https://developer.spotify.com/documentation/general/guides/track-relinking-guide/
    private readonly error$ = new Subject<unknown>();
    private readonly spotifyPlayerLoaded$ = new BehaviorSubject(false);
    private readonly state$ = new BehaviorSubject<Spotify.PlaybackState | null>(null);
    private loadedSrc = '';
    private loadError?: LoadError;
    private deviceId = '';
    private hasWaited = false;
    autoplay = false;
    hidden = true;
    loop = false;
    #muted = true;
    #volume = 1;

    constructor(private readonly accessToken$: Observable<string>) {
        window.onSpotifyWebPlaybackSDKReady = this.onSpotifyWebPlaybackSDKReady;

        // Only load the player script if needed.
        this.observeIsLoggedIn()
            .pipe(
                filter((isLoggedIn) => isLoggedIn),
                take(1),
                mergeMap(() => loadScript(spotifyPlayerSdk))
            )
            .subscribe(logger);

        // Load new tracks.
        this.observePaused()
            .pipe(
                switchMap((paused) => (paused ? EMPTY : this.observeItem())),
                withLatestFrom(this.observeAccessToken()),
                switchMap(([item, token]) => {
                    if (item && item.src !== this.loadedSrc) {
                        return of(undefined).pipe(
                            mergeMap(() => this.createPlayer(token)),
                            withLatestFrom(this.observeAccessToken()), // may have been refreshed
                            mergeMap(([, token]) => this.loadAndPlay(item, token)),
                            catchError((error) => {
                                this.loadedSrc = '';
                                this.error$.next(error);
                                this.currentTrackSrc$.next('');
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

        // Current track.
        this.observeItem().subscribe(() => this.currentTrackSrc$.next(''));

        this.observeState()
            .pipe(
                tap((state) => {
                    const currentTrack = state.track_window?.current_track?.uri;
                    if (currentTrack && this.loadedSrc === this.src) {
                        if (this.currentTrackSrc !== currentTrack) {
                            this.currentTrackSrc$.next(currentTrack);
                        }
                    }
                })
            )
            .subscribe(logger);

        this.currentTrackSrc$
            .pipe(
                switchMap((currentTrackSrc) =>
                    currentTrackSrc
                        ? this.observeCurrentTrackState().pipe(
                              filter((state) => state.paused !== this.paused),
                              take(1),
                              delay(200), // Seems about as low as I can go.
                              mergeMap(() => this.getCurrentState()),
                              filter((state) => state?.paused !== this.paused),
                              concatMap(() => {
                                  if (this.paused) {
                                      logger.log('State mismatch: pausing...');
                                      return this.safePause();
                                  } else {
                                      logger.log('State mismatch: resuming...');
                                      return this.safePlay();
                                  }
                              })
                          )
                        : EMPTY
                )
            )
            .subscribe(logger);

        // Stop and emit an error on logout.
        // The media player will only emit the error if Spotify is the current player.
        this.observeIsLoggedIn()
            .pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                filter((isLoggedIn) => !isLoggedIn),
                mergeMap(() => this.unload()),
                tap(() => this.error$.next(Error('Not logged in')))
            )
            .subscribe(logger);

        // Log errors.
        this.observeError().subscribe(logger.error);
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
            filter((state) => state?.track_window?.current_track?.uri === this.currentTrackSrc),
            map((state) => state!.position / 1000),
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
        return this.currentTrackSrc$.pipe(
            switchMap((src) =>
                src
                    ? this.observeCurrentTrackState().pipe(
                          distinctUntilChanged(comparePausedAndPosition),
                          withLatestFrom(this.observePaused()),
                          map(([state, paused]) => !paused && !state.paused),
                          distinctUntilChanged(),
                          filter((playing) => playing),
                          map(() => undefined)
                      )
                    : EMPTY
            )
        );
    }

    observeCurrentTrackState(): Observable<Spotify.PlaybackState> {
        return this.observeState().pipe(
            filter((state) => state.track_window?.current_track?.uri === this.currentTrackSrc)
        );
    }

    appendTo(): void {
        // Automatically appended by Spotify Player SDK.
    }

    load(item: PlayableItem): void {
        logger.log('load', item.src);
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.safeReload(item);
        }
    }

    play(): void {
        logger.log('play');
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.safePlay();
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
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
        this.safeStop();
    }

    seek(time: number): void {
        this.player?.seek(time * 1000);
    }

    resize(): void {
        // not visible
    }

    async getCurrentState(): Promise<Spotify.PlaybackState | null> {
        return this.player?.getCurrentState() || null;
    }

    private get item(): PlayableItem | null {
        return this.item$.value;
    }

    private get paused(): boolean {
        return this.paused$.value;
    }

    private get src(): string | undefined {
        return this.item?.src;
    }

    private get currentTrackSrc(): string {
        return this.currentTrackSrc$.value;
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

    private observeItem(): Observable<PlayableItem | null> {
        return this.item$.pipe(distinctUntilChanged());
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeState(): Observable<Spotify.PlaybackState> {
        return this.state$.pipe(filter(exists));
    }

    private onSpotifyWebPlaybackSDKReady = () => {
        logger.log('onSpotifyWebPlaybackSDKReady');
        this.spotifyPlayerLoaded$.next(true);
    };

    private async loadAndPlay(item: PlayableItem, token: string, retryCount = 3): Promise<void> {
        if (this.paused) {
            // Playback was paused during the loading of the Spotify player.
            return;
        }

        const {src, startTime = 0} = item;
        const position_ms = startTime * 1000;

        if (src !== this.src) {
            // We've moved on from this request.
            logger.warn(`Cancelled request for: '${src}'`);
            return;
        }

        if (!token) {
            throw Error('No access token');
        }

        const controller = new AbortController();
        const subscription = this.observePaused()
            .pipe(
                filter((paused) => paused),
                take(1)
            )
            .subscribe(() => controller.abort('paused'));

        let response: Response;
        try {
            response = await fetch(`${spotifyApi}/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({uris: [src], position_ms}),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                signal: controller.signal,
            });
        } catch (err) {
            subscription.unsubscribe();
            if (controller.signal.aborted) {
                return;
            }
            throw err;
        }

        subscription.unsubscribe();

        if (this.paused) {
            // Playback was paused during fetching.
            return;
        }

        if (!response.ok) {
            if (retryCount > 0) {
                switch (response.status) {
                    case 401: {
                        const token = await refreshToken();
                        return this.loadAndPlay(item, token, --retryCount);
                    }

                    case 429: {
                        const retryAfter = Number(response.headers?.get('Retry-After'));
                        if (retryAfter && retryAfter <= 5) {
                            await sleep(retryAfter * 1000);
                            return this.loadAndPlay(item, token, 0);
                        } else {
                            throw response;
                        }
                    }

                    case 404:
                    case 502:
                    case 503: {
                        await this.reconnect(token);
                        return this.loadAndPlay(item, token, --retryCount);
                    }
                }
            }
            this.loadError = {src, error: response};
            throw response;
        }

        this.loadError = undefined;
        this.loadedSrc = src;
        // Refresh state.
        // Spotify Player SDK will sometimes emit it's state changes before we exit this function.
        this.state$.next(this.state$.value);
    }

    private async connect(token: string): Promise<Spotify.Player> {
        if (!token) {
            throw Error('No access token');
        }
        return new Promise((resolve, reject) => {
            let tokenRefreshRequired = false;

            const player = new Spotify.Player({
                name: __app_name__,
                getOAuthToken: async (callback) => {
                    if (tokenRefreshRequired) {
                        try {
                            token = await refreshToken();
                        } catch (err) {
                            logger.error(err);
                            token = '';
                        }
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
                this.deviceId = device_id;
                resolve(player);
            });

            logger.log('connecting...');
            player.connect();
        });
    }

    private async createPlayer(token: string): Promise<void> {
        if (this.player) {
            if (this.loadError) {
                if (!token) {
                    throw Error('No access token');
                }
                await this.reconnect(token);
            }
        } else {
            const loaded = await this.waitForPlayer();
            if (loaded) {
                const token = await firstValueFrom(this.observeAccessToken());
                this.player = await this.connect(token);
                await this.player.activateElement();
            } else {
                throw Error('Spotify player not loaded');
            }
        }
    }

    private async disconnect(): Promise<void> {
        this.loadedSrc = '';
        this.currentTrackSrc$.next('');
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
            await this.safePause();
            player.disconnect();
            this.player = null;
        }
    }

    private async reconnect(token: string): Promise<Spotify.Player> {
        logger.log('reconnect');
        const reconnect$ = from(this.disconnect()).pipe(
            delay(1000), // TODO: remove/reduce?
            mergeMap(() => this.connect(token)),
            delay(3000)
        );
        return firstValueFrom(reconnect$);
    }

    private async safePause(): Promise<void> {
        try {
            await this.player?.pause();
        } catch (err) {
            logger.error(err);
        }
    }

    private async safePlay(): Promise<void> {
        try {
            await this.player?.resume();
        } catch (err) {
            this.error$.next(err);
        }
    }

    protected async safeReload(item: PlayableItem): Promise<void> {
        try {
            const [, , id] = item.src.split(':');
            const state = await this.getCurrentState();
            if (state?.track_window?.current_track?.id === id) {
                await this.player?.seek((item.startTime || 0) * 1000);
                if (this.autoplay) {
                    await this.player?.resume();
                }
            } else {
                this.loadedSrc = '';
                this.item$.next({...item});
            }
        } catch (err) {
            this.error$.next(err);
        }
    }

    private async safeStop(): Promise<void> {
        try {
            if (this.player) {
                const state = await this.getCurrentState();
                if (state?.track_window?.current_track) {
                    await this.player.pause();
                    if (state.position) {
                        await this.player.seek(0);
                    }
                } else {
                    this.loadedSrc = '';
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

    private async unload(): Promise<void> {
        await this.safeStop();
        this.loadedSrc = '';
    }

    private async waitForPlayer(): Promise<boolean> {
        const spotifyPlayerLoaded$ = this.spotifyPlayerLoaded$;
        let loaded = spotifyPlayerLoaded$.value;
        if (!loaded && !this.hasWaited) {
            const loaded$ = spotifyPlayerLoaded$.pipe(filter((loaded) => loaded));
            const timeout$ = timer(3000).pipe(map(() => false));
            loaded = await firstValueFrom(race(loaded$, timeout$));
            this.hasWaited = true;
        }
        return loaded;
    }
}

export default new SpotifyPlayer(observeAccessToken());
