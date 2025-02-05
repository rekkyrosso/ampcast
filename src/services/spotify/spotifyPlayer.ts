import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    debounceTime,
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
    pairwise,
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
import {exists, loadScript, Logger, observeBeforeEndOfTrack, sleep} from 'utils';
import {observeAccessToken, refreshToken} from './spotifyAuth';

interface LoadError {
    readonly src: string;
    readonly error: unknown;
}

const logger = new Logger('spotifyPlayer');

const spotifyPlayerApi = 'https://api.spotify.com/v1/me/player';
const spotifyPlayerSdk = 'https://sdk.scdn.co/spotify-player.js';

export class SpotifyPlayer implements Player<PlayableItem> {
    private player: Spotify.Player | null = null;
    private readonly accessToken$ = new BehaviorSubject('');
    private readonly paused$ = new BehaviorSubject(true);
    private readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly nextItem$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly playing$ = new Subject<void>();
    private readonly ended$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly playerLoaded$ = new BehaviorSubject(false);
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

    constructor(accessToken$: Observable<string>) {
        window.onSpotifyWebPlaybackSDKReady = this.onSpotifyWebPlaybackSDKReady;

        accessToken$.subscribe((token) => this.accessToken$.next(token));

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
                switchMap((item) => {
                    if (item && item.src !== this.loadedSrc) {
                        return of(undefined).pipe(
                            mergeMap(() => this.createPlayer()),
                            mergeMap(() => this.loadAndPlay(item)),
                            catchError((error) => {
                                this.loadedSrc = '';
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

        // `playing` event.
        this.observeState()
            .pipe(
                withLatestFrom(this.observePaused()),
                map(([state, paused]) => !paused && !state.paused && !state.loading),
                distinctUntilChanged(),
                filter((playing) => playing)
            )
            .subscribe(() => this.playing$.next());

        // `ended` event.
        this.observeState()
            .pipe(
                pairwise(),
                map(
                    ([prevState, nextState]) =>
                        !prevState.loading &&
                        nextState.loading &&
                        prevState.position !== 0 &&
                        nextState.position === 0 &&
                        this.compareTrackSrc(prevState.track_window?.current_track, this.src)
                ),
                filter((ended) => ended)
            )
            .subscribe(() => this.ended$.next());

        // Queue next track.
        observeBeforeEndOfTrack(this, 10)
            .pipe(
                filter((atBeforeEnd) => atBeforeEnd),
                withLatestFrom(this.nextItem$),
                map(([, nextItem]) => nextItem),
                filter(exists),
                mergeMap((nextItem) => this.addToQueue(nextItem))
            )
            .subscribe(logger);

        // Fix play state mismatches.
        this.observePaused()
            .pipe(
                switchMap((paused) => (paused ? this.observeState() : EMPTY)),
                map((state) => !state.loading && !state.paused),
                distinctUntilChanged(),
                filter((misMatch) => misMatch),
                debounceTime(10), // Needs to be async
                tap(() => logger.log('State mismatch: pausing...')),
                mergeMap(() => this.safePause())
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
            this.observeState(),
            this.observePaused().pipe(
                switchMap((paused) =>
                    paused
                        ? this.getCurrentState()
                        : interval(250).pipe(mergeMap(() => this.getCurrentState()))
                )
            )
        ).pipe(
            filter((state) => this.compareTrackSrc(state?.track_window?.current_track, this.src)),
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
        return this.ended$;
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.playing$;
    }

    observeCurrentTrackState(): Observable<Spotify.PlaybackState> {
        return this.observeState().pipe(
            filter((state) => this.compareTrackSrc(state.track_window?.current_track, this.src))
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

    loadNext(item: PlayableItem | null): void {
        this.nextItem$.next(item);
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

    private get token(): string {
        return this.accessToken$.value;
    }

    private observeAccessToken(): Observable<string> {
        return this.accessToken$.pipe(distinctUntilChanged());
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
        this.playerLoaded$.next(true);
    };

    private async loadAndPlay(item: PlayableItem, retryCount = 2): Promise<void> {
        if (this.paused) {
            // Playback was paused during the loading of the Spotify player.
            return;
        }

        const {src, startTime = 0} = item;
        if (src !== this.src) {
            // We've moved on from this request.
            return;
        }

        if (!this.token) {
            throw Error('No access token');
        }

        let tempMuted = false;
        const state = this.state$.value;
        const currentTrack = state?.track_window?.current_track;
        if (currentTrack) {
            if (this.compareTrackSrc(currentTrack, src)) {
                this.loadError = undefined;
                this.loadedSrc = src;
                if (state.paused) {
                    this.safePlay();
                }
                return;
            } else if (this.loadedSrc && !this.compareTrackSrc(currentTrack, this.loadedSrc)) {
                // Something else is loaded so mute it.
                if (!state.paused) {
                    tempMuted = true;
                    this.safeVolume(0);
                }
            }
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
            response = await fetch(`${spotifyPlayerApi}/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    uris: [src],
                    position_ms: startTime * 1000,
                }),
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
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
            if (--retryCount >= 0) {
                switch (response.status) {
                    case 401: {
                        const token = await refreshToken();
                        this.accessToken$.next(token);
                        return this.loadAndPlay(item, retryCount);
                    }

                    case 429: {
                        const retryAfter = Number(response.headers?.get('Retry-After'));
                        if (retryAfter && retryAfter <= 5) {
                            await sleep(retryAfter * 1000);
                            return this.loadAndPlay(item, retryCount);
                        } else {
                            throw response;
                        }
                    }

                    case 404:
                    case 502:
                    case 503: {
                        await this.reconnect();
                        return this.loadAndPlay(item, retryCount);
                    }
                }
            }
            this.loadError = {src, error: response};
            throw response;
        }

        this.loadError = undefined;
        this.loadedSrc = src;
        if (tempMuted) {
            this.safeVolume(this.volume);
        }
    }

    private async addToQueue(item: PlayableItem): Promise<void> {
        try {
            const queue = this.state$.value?.track_window?.next_tracks;
            if (!this.token || !item || item.src === this.src || queue?.[0]) {
                return;
            }
            const response = await fetch(
                `${spotifyPlayerApi}/queue?device_id=${this.deviceId}&uri=${encodeURIComponent(
                    item.src
                )}`,
                {
                    method: 'POST',
                    headers: {Authorization: `Bearer ${this.token}`},
                }
            );
            if (!response.ok) {
                throw response;
            }
        } catch (err) {
            logger.error(err);
        }
    }

    private async connect(): Promise<Spotify.Player> {
        let token = this.token;
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
                            this.accessToken$.next(token);
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

            player.addListener('initialization_error', (err) => {
                logger.error(err);
                reject('Failed to create player');
            });

            player.addListener('authentication_error', (err) => {
                logger.error(err);
            });

            player.addListener('account_error', (err) => {
                logger.log('Spotify Premium required');
                logger.error(err);
            });

            player.addListener('playback_error', (err) => {
                this.error$.next(err);
            });

            player.addListener('player_state_changed', (state) => {
                this.state$.next(state);
            });

            player.addListener('not_ready', ({device_id}) => {
                logger.log('not_ready');
                this.deviceId = device_id;
                resolve(player);
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

    private async createPlayer(): Promise<void> {
        if (this.player) {
            if (this.loadError) {
                if (!this.token) {
                    throw Error('No access token');
                }
                await this.reconnect();
            }
        } else {
            const loaded = await this.waitForPlayer();
            if (loaded) {
                this.player = await this.connect();
                await this.player.activateElement();
            } else {
                throw Error('Spotify player not loaded');
            }
        }
    }

    private async disconnect(): Promise<void> {
        this.loadedSrc = '';
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

    private async reconnect(): Promise<Spotify.Player> {
        logger.log('reconnect');
        const reconnect$ = from(this.disconnect()).pipe(
            delay(1000),
            mergeMap(() => this.connect()),
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
            const state = await this.getCurrentState();
            if (this.compareTrackSrc(state?.track_window?.current_track, item.src)) {
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
                const state = this.state$.value;
                if (state?.track_window?.current_track) {
                    await this.player.pause();
                    if (!state.loading && state.position) {
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
        const playerLoaded$ = this.playerLoaded$;
        let loaded = playerLoaded$.value;
        if (!loaded && !this.hasWaited) {
            const loaded$ = playerLoaded$.pipe(filter((loaded) => loaded));
            const timeout$ = timer(3000).pipe(map(() => false));
            loaded = await firstValueFrom(race(loaded$, timeout$));
            this.hasWaited = true;
        }
        return loaded;
    }

    private compareTrackSrc(track: Spotify.Track | undefined, src = ''): boolean {
        // https://developer.spotify.com/documentation/general/guides/track-relinking-guide/
        return track?.uri === src || track?.linked_from?.uri === src;
    }
}

export default new SpotifyPlayer(observeAccessToken());
