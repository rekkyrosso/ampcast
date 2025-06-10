import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    of,
    skipWhile,
    switchMap,
    take,
    tap,
    timer,
} from 'rxjs';
import LinearType from 'types/LinearType';
import PlayableItem from 'types/PlayableItem';
import PlaylistItem from 'types/PlaylistItem';
import Player from 'types/Player';
import {Logger, uniqBy} from 'utils';
import {MAX_DURATION} from 'services/constants';
import audio from 'services/audio';
import {observeIsLoggedIn, waitForLogin} from 'services/mediaServices';
import {createNowPlayingItem} from './musicKitUtils';

const logger = new Logger('MusicKitPlayer');

export class MusicKitPlayer implements Player<PlayableItem> {
    private player?: MusicKit.MusicKitInstance;
    private readonly paused$ = new BehaviorSubject(true);
    private readonly duration$ = new Subject<number>();
    private readonly currentTime$ = new Subject<number>();
    private readonly ended$ = new Subject<void>();
    private readonly playing$ = new Subject<void>();
    private readonly nowPlaying$ = new Subject<
        MusicKit.MediaItem | MusicKit.TimedMetadata | undefined
    >();
    private readonly error$ = new Subject<unknown>();
    private readonly element: HTMLElement;
    private readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    private loadedSrc = '';
    private hasWaited = false;
    private ended = false;
    private loading = false;
    private stopped = false;
    private skipping = false;
    private currentTimedMetadata: MusicKit.TimedMetadata | undefined;
    autoplay = false;
    loop = false;
    #muted = true;
    #volume = 1;

    constructor() {
        const element = (this.element = document.createElement('div'));
        element.hidden = true;
        element.className = 'apple-video';
        element.id = 'apple-music-video-container';

        // Load new tracks.
        this.observePaused()
            .pipe(
                switchMap((paused) => (paused ? EMPTY : this.observeItem())),
                switchMap((item) => {
                    if (item && item.src !== this.loadedSrc) {
                        return of(undefined).pipe(
                            mergeMap(() => this.loadAndPlay(item)),
                            catchError((error) => {
                                this.skipping = false;
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

        this.observeItem()
            .pipe(
                tap(() => (this.currentTimedMetadata = undefined)),
                switchMap(() => (this.isLinear ? this.playing$ : EMPTY)),
                switchMap(() => timer(5000, 2000)),
                map(() => (this.isLivePlayback ? this.currentTimedMetadata : this.nowPlayingItem)),
                distinctUntilChanged(),
                tap(this.nowPlaying$)
            )
            .subscribe(logger);

        // Stop and emit an error on logout.
        // The media player will only emit the error if this player is the current player.
        observeIsLoggedIn('apple')
            .pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                filter((isLoggedIn) => !isLoggedIn),
                mergeMap(() => this.unload()),
                tap(() => this.error$.next(Error('Not logged in')))
            )
            .subscribe(logger);

        this.observePlaying().subscribe(() => (this.ended = false));
        this.observeEnded().subscribe(() => (this.ended = true));

        // Log errors.
        this.observeError().subscribe(logger.error);
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        this.#muted = muted;
        this.synchVolume();
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        this.#volume = volume;
        this.synchVolume();
    }

    observeCurrentTime(): Observable<number> {
        return this.currentTime$.pipe(
            distinctUntilChanged(),
            filter(() => this.player?.playbackState !== MusicKit.PlaybackStates.seeking)
        );
    }

    observeDuration(): Observable<number> {
        return this.duration$.pipe(distinctUntilChanged());
    }

    observePlaying(): Observable<void> {
        return this.playing$;
    }

    observeEnded(): Observable<void> {
        return this.ended$;
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observeNowPlaying(station: PlaylistItem): Observable<PlaylistItem> {
        return this.nowPlaying$.pipe(
            map((nowPlaying) =>
                station.linearType === LinearType.Station && station.src === this.src
                    ? nowPlaying
                    : undefined
            ),
            switchMap((nowPlaying) =>
                nowPlaying ? createNowPlayingItem(nowPlaying, station) : of(station)
            ),
            distinctUntilChanged((a, b) => a.src === b.src)
        );
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        logger.log('load', item.src);
        if (this.autoplay) {
            this.stopped = false;
        }
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.safeReload(item);
        }
    }

    loadNext(item: PlayableItem | null): void {
        if (this.player && item && !this.isLinear && !item.linearType) {
            const [, , id] = item.src.split(':');
            const queue = this.player.queue;
            if (queue.length > 0 && queue.items[queue.position + 1]?.id !== id) {
                const queueItem = this.getQueueItem(item);
                this.player.playNext(queueItem).then(undefined, logger.warn);
            }
        }
    }

    play(): void {
        logger.log('play');
        this.stopped = false;
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
        this.stopped = true;
        this.paused$.next(true);
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
        this.currentTimedMetadata = undefined;
        this.safeStop();
    }

    seek(time: number): void {
        if (!this.isLivePlayback) {
            this.player?.seekToTime(time);
        }
    }

    async skipNext(): Promise<void> {
        if (this.isLinear && !this.isLivePlayback) {
            await this.player?.skipToNextItem();
            this.nowPlaying$.next(this.nowPlayingItem);
        }
    }

    async skipPrev(): Promise<void> {
        if (this.isLinear && !this.isLivePlayback) {
            await this.player?.skipToPreviousItem();
            this.nowPlaying$.next(this.nowPlayingItem);
        }
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }

    private get isLinear(): boolean {
        return !!this.item?.linearType;
    }

    private get isLivePlayback(): boolean {
        return !!this.item?.isLivePlayback;
    }

    private get item(): PlayableItem | null {
        return this.item$.value;
    }

    private get nowPlayingItem(): MusicKit.MediaItem | undefined {
        return this.player?.nowPlayingItem;
    }

    private get paused(): boolean {
        return this.paused$.value;
    }

    private get src(): string | undefined {
        return this.item?.src;
    }

    private observeItem(): Observable<PlayableItem | null> {
        return this.item$.pipe(distinctUntilChanged());
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private async createPlayer(): Promise<MusicKit.MusicKitInstance> {
        if (this.player) {
            return this.player;
        }
        const isLoggedIn = await this.waitForLogin();
        if (isLoggedIn) {
            if (this.player) {
                return this.player;
            }
            const player = (this.player = MusicKit.getInstance());
            const Events = MusicKit.Events;

            this.synchVolume();

            player.addEventListener(Events.playbackStateDidChange, this.onPlaybackStateChange);
            player.addEventListener(Events.playbackDurationDidChange, this.onDurationChange);
            player.addEventListener(Events.playbackTimeDidChange, this.onTimeChange);
            player.addEventListener(Events.queuePositionDidChange, this.onQueuePositionDidChange);
            player.addEventListener(Events.mediaPlaybackError, this.onError);
            // This event is undocumented.
            player.addEventListener('timedMetadataDidChange', this.onTimedMetadataDidChange);

            return player;
        } else {
            throw Error('Not logged in');
        }
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        let player = this.player;
        if (!player) {
            player = await this.createPlayer();
        }

        // Check `paused` state after asynchronicity.
        if (this.paused) {
            return;
        }

        if (!player?.isAuthorized) {
            throw Error('Not logged in');
        }

        this.loading = true;
        const {src, startTime = 0} = item;
        const [, , id] = src.split(':');
        const {items: queueItems, position} = player.queue;
        // Ignore if the item is already playing.
        // Skip for prev/next item.
        // Otherwise, reset the queue.
        if (queueItems[position]?.id === id) {
            if (player.isPlaying) {
                // Needs to be async.
                await Promise.resolve();
            } else {
                await player.play();
            }
        } else if (queueItems[position - 1]?.id === id) {
            this.skipping = true;
            await player.skipToPreviousItem();
            this.skipping = false;
        } else if (queueItems[position + 1]?.id === id) {
            this.skipping = true;
            await player.skipToNextItem();
            this.skipping = false;
        } else {
            const queueItem = this.getQueueItem(item);
            await player.setQueue({...queueItem, startTime, startPlaying: true});
        }
        this.loadedSrc = item.src;
        this.loading = false;

        try {
            if (this.paused) {
                // Pause/stop button clicked during the play request.
                if (this.stopped) {
                    await player.stop();
                } else {
                    await player.pause();
                }
            } else {
                this.playing$.next();
            }
        } catch (err) {
            if (!this.paused) {
                throw err;
            }
        }
    }

    private getQueueItem(item: PlayableItem): MusicKit.SetQueueOptions {
        const [, type, id] = item.src.split(':');

        // "(library-)?music-videos" => "musicVideo"
        const kind = type
            .replace('library-', '')
            .replace(/s$/, '')
            .replace(/-([a-z])/g, (_, char) => char.toUpperCase());

        return {[kind]: id};
    }

    private async safePause(): Promise<void> {
        try {
            if (this.player) {
                if (this.player.playbackState !== MusicKit.PlaybackStates.paused) {
                    await this.player.pause();
                }
            }
        } catch (err) {
            logger.error(err);
        }
    }

    private async safePlay(): Promise<void> {
        try {
            const item = this.item;
            if (this.player && !this.player.isPlaying && item) {
                if (this.isLoadedItem(item)) {
                    await this.player.play();
                    if (this.paused) {
                        // Pause/stop button clicked during the play request.
                        if (this.stopped) {
                            await this.player.stop();
                        } else {
                            await this.player.pause();
                        }
                    } else {
                        this.playing$.next();
                    }
                } else {
                    this.loadedSrc = '';
                    this.item$.next({...item});
                }
            }
        } catch (err) {
            if (!this.paused) {
                this.error$.next(err);
            }
        }
    }

    protected async safeReload(item: PlayableItem): Promise<void> {
        if (this.isLoadedItem(item)) {
            try {
                await this.player?.seekToTime(item.startTime || 0);
            } catch (err) {
                logger.error(err);
            }
            if (this.autoplay) {
                await this.safePlay();
            }
        } else {
            this.loadedSrc = '';
            this.item$.next({...item});
        }
    }

    private async safeStop(): Promise<void> {
        try {
            if (this.player) {
                if (this.player.playbackState !== MusicKit.PlaybackStates.stopped) {
                    await this.player.stop();
                }
            }
        } catch (err) {
            logger.warn(err);
        }
    }

    private synchVolume(): void {
        if (this.player && this.src) {
            const [, type] = this.src.split(':');
            this.player.volume =
                // Audio volume is handled by a `GainNode`.
                !audio.streamingSupported || /video/i.test(type)
                    ? this.muted
                        ? 0
                        : this.volume
                    : 1;
        }
    }

    private isLoadedItem(item: PlayableItem | null): boolean {
        if (this.player && item) {
            const [, , id] = item.src.split(':');
            const {items, position} = this.player.queue;
            return items[position]?.id === id;
        }
        return false;
    }

    private async unload(): Promise<void> {
        try {
            await this.safeStop();
            await this.player?.setQueue({});
            this.loadedSrc = '';
        } catch (err) {
            logger.error(err);
        }
    }

    private async waitForLogin(): Promise<boolean> {
        const waitTime = this.hasWaited ? 0 : 3000; // Only wait once.
        const isLoggedIn = await waitForLogin('apple', waitTime);
        this.hasWaited = true;
        return isLoggedIn;
    }

    // The MusicKit typings for these callbacks are a bit lacking so they are all `any` for now.

    private readonly onPlaybackStateChange: any = async ({
        state,
    }: {
        state: MusicKit.PlaybackStates;
    }) => {
        switch (state) {
            case MusicKit.PlaybackStates.playing: {
                if (this.stopped) {
                    this.safeStop();
                } else {
                    const [, , id] = this.src?.split(':') ?? [];
                    const nowPlayingItem = this.nowPlayingItem;
                    if (nowPlayingItem?.isPlayable === false && nowPlayingItem.id === id) {
                        // Apple Music plays 30 seconds of silence for unplayable tracks.
                        this.error$.next(Error('Unplayable'));
                        this.stop();
                    }
                    // TODO: This probably not true any more.
                    // We can't emit the `playing` event here.
                    // It causes problems in Firefox (possibly related to DRM and visualizers).
                    // Emitting the event after a successful call to `player.play()` works just as well.
                }
                break;
            }

            case MusicKit.PlaybackStates.ended:
                if (!this.ended && !this.loading && !this.isLinear) {
                    this.ended$.next();
                }
                break;

            case MusicKit.PlaybackStates.completed:
                this.ended$.next();
                break;
        }
    };

    private readonly onDurationChange: any = ({duration}: {duration: number}) => {
        this.duration$.next(this.isLivePlayback ? MAX_DURATION : duration);
    };

    private readonly onQueuePositionDidChange: any = ({
        oldPosition,
    }: {
        oldPosition: number;
        position: number;
    }) => {
        if (oldPosition !== -1 && !this.skipping && !this.isLinear) {
            this.ended$.next();
        }
    };

    private readonly onTimeChange: any = ({currentPlaybackTime}: {currentPlaybackTime: number}) => {
        const playbackState = this.player?.playbackState || 0;
        // Skip the playback states that always emit zero.
        if (playbackState && playbackState !== MusicKit.PlaybackStates.stopped) {
            this.currentTime$.next(currentPlaybackTime);
        }
    };

    private readonly onTimedMetadataDidChange: any = (timedMetadata: MusicKit.TimedMetadata) => {
        // If the links have duplicate entries then this represents a transition between
        // the current track and the next. That means we get track changes a bit too early.
        // Wait for the unique links instead. (Hopefully this keeps on working).
        if (uniqBy('description', timedMetadata.links).length === timedMetadata.links.length) {
            this.currentTimedMetadata = timedMetadata;
        }
    };

    private readonly onError: any = (err: any) => {
        this.error$.next(err);
    };
}

export default new MusicKitPlayer();
