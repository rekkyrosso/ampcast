import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    of,
    switchMap,
    take,
    tap,
} from 'rxjs';
import {nanoid} from 'nanoid';
import LinearType from 'types/LinearType';
import MetadataChange from 'types/MetadataChange';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';
import {observeMetadataChanges} from 'services/metadata';
import HLSPlayer from 'services/mediaPlayback/players/HLSPlayer';
import HTML5Player from 'services/mediaPlayback/players/HTML5Player';
import OmniPlayer from 'services/mediaPlayback/players/OmniPlayer';
import observeNearEnd from 'services/mediaPlayback/players/observeNearEnd';
import plexApi from './plexApi';
import plexSettings from './plexSettings';
import plexUtils from './plexUtils';

const logger = new Logger('plexRadioPlayer');

export class PlexRadioPlayer implements Player<PlayableItem> {
    private readonly player: OmniPlayer<PlayableItem>;
    private readonly radio$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly paused$ = new BehaviorSubject(true);
    private readonly ended$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly skip$ = new Subject<void>();
    private readonly nowPlaying$ = new Subject<PlaylistItem | null>();
    private readonly position$ = new BehaviorSubject(0);
    private playQueue: plex.PlayQueue | undefined;
    private items: readonly PlaylistItem[] = [];
    private loadedSrc = '';
    #autoplay = false;

    constructor() {
        const hlsPlayer = new HLSPlayer('audio', 'plex-radio-hls');
        const html5Player = new HTML5Player('audio', 'plex-radio-html5');

        this.player = new OmniPlayer('plexRadioPlayer');

        this.player.registerPlayers([
            [html5Player, () => true],
            [hlsPlayer, (item) => item?.playbackType === PlaybackType.HLS],
        ]);

        this.player.observeError().subscribe(this.error$);

        // Load new radios.
        this.observePaused()
            .pipe(
                filter((paused) => !paused),
                take(1),
                switchMap(() => this.observeRadio()),
                switchMap((item) => {
                    if (item && item.src !== this.loadedSrc) {
                        return of(undefined).pipe(
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

        // `ended`.
        this.player
            .observeEnded()
            .pipe(
                map(() => this.position === this.trackCount - 1),
                distinctUntilChanged(),
                filter((atEnd) => atEnd),
                tap(() => this.ended$.next())
            )
            .subscribe(logger);

        // Load next radio track.
        this.player
            .observeEnded()
            .pipe(
                map(() => this.position + 1),
                filter((position) => position < this.trackCount),
                tap(this.position$),
                mergeMap((position) => this.getPlayableItem(position)),
                tap((item) => this.loadPlayer(item))
            )
            .subscribe(logger);

        // Delay loading after skipping.
        this.skip$
            .pipe(
                debounceTime(300),
                map(() => this.position),
                mergeMap((position) => this.getPlayableItem(position)),
                tap((item) => this.loadPlayer(item))
            )
            .subscribe(logger);

        // Keep `playQueue` updated.
        this.position$
            .pipe(
                filter(() => this.items.length < this.trackCount),
                map((position) => position >= this.items.length - 10),
                distinctUntilChanged(),
                filter((nearEnd) => nearEnd),
                mergeMap(() => this.refreshPlayQueue())
            )
            .subscribe(logger);

        // Prepare for next track.
        observeNearEnd(this, 10)
            .pipe(
                filter((nearEnd) => nearEnd),
                map(() => this.position + 1),
                mergeMap((position) => this.getPlayableItem(position))
            )
            .subscribe(logger);

        // Refresh play queue on metadata changes.
        observeMetadataChanges<PlaylistItem>()
            .pipe(tap((changes) => this.applyMetadataChanges(changes)))
            .subscribe(logger);
    }

    get autoplay(): boolean {
        return this.#autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.#autoplay = autoplay;
        this.player.autoplay = autoplay;
    }

    get hidden(): boolean {
        return this.player.hidden;
    }

    set hidden(hidden: boolean) {
        this.player.hidden = hidden;
    }

    get loop(): boolean {
        return this.player.loop;
    }

    set loop(loop: boolean) {
        this.player.loop = loop;
    }

    get muted(): boolean {
        return this.player.muted;
    }

    set muted(muted: boolean) {
        this.player.muted = muted;
    }

    get volume(): number {
        return this.player.volume;
    }

    set volume(volume: number) {
        this.player.volume = volume;
    }

    observeCurrentTime(): Observable<number> {
        return this.player.observeCurrentTime();
    }

    observeDuration(): Observable<number> {
        return this.player.observeDuration();
    }

    observeEnded(): Observable<void> {
        return this.ended$;
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.player.observePlaying();
    }

    observeNowPlaying(radio: PlaylistItem): Observable<PlaylistItem> {
        return this.nowPlaying$.pipe(
            map((item) => (this.src === radio.src ? item : null)),
            distinctUntilChanged(),
            map((item) => (item ? {...item, stationName: radio.title} : radio))
        );
    }

    appendTo(parentElement: HTMLElement): void {
        this.player.appendTo(parentElement);
    }

    load(item: PlayableItem): void {
        logger.log('load', item.src);
        this.radio$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.loadPlayer(this.currentQueueItem);
        }
    }

    play(): void {
        logger.log('play');
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.player.play();
        }
    }

    pause(): void {
        logger.log('pause');
        this.paused$.next(true);
        this.player.pause();
    }

    stop(): void {
        logger.log('stop');
        this.paused$.next(true);
        this.player.stop();
    }

    seek(time: number): void {
        this.player.seek(time);
    }

    async skipNext(): Promise<void> {
        return this.skipTo(this.position + 1);
    }

    async skipPrev(): Promise<void> {
        if (this.position === 0) {
            this.seek(0);
        } else {
            return this.skipTo(this.position - 1);
        }
    }

    resize(width: number, height: number): void {
        this.player.resize(width, height);
    }

    private get currentQueueItem(): PlaylistItem | null {
        return this.items[this.position];
    }

    private get position(): number {
        return this.position$.value;
    }

    private get radio(): PlayableItem | null {
        return this.radio$.value;
    }

    private get src(): string | undefined {
        return this.radio?.src;
    }

    private get trackCount(): number {
        return this.playQueue?.playQueueTotalCount || 0;
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeRadio(): Observable<PlayableItem | null> {
        return this.radio$.pipe(distinctUntilChanged());
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        this.playQueue = await plexApi.createPlayQueue(item, {
            maxDegreesOfSeparation: plexSettings.radioDegreesOfSeparation,
        });
        this.items = await this.createPlaylistItems(this.playQueue.Metadata);
        const playableItem = await this.getPlayableItem(0);
        if (!playableItem) {
            throw Error('No radio tracks');
        }
        this.loadedSrc = item.src;
        this.position$.next(0);
        this.loadPlayer(playableItem);
    }

    private loadPlayer(item: PlaylistItem | null): void {
        if (item) {
            this.player.load(item);
            this.nowPlaying$.next(item);
        } else {
            this.error$.next('No media source');
        }
    }

    private applyMetadataChanges(changes: readonly MetadataChange<PlaylistItem>[]): void {
        let changed = false;
        const items = this.items.map((item) => {
            for (const {match, values} of changes) {
                if (match(item)) {
                    changed = true;
                    return {...item, ...values};
                }
            }
            return item;
        });
        if (changed) {
            this.items = items;
            this.nowPlaying$.next(this.currentQueueItem);
        }
    }

    private async createPlaylistItems(
        queueItems: readonly plex.PlayQueueItem[]
    ): Promise<readonly PlaylistItem[]> {
        const [tracks, albums] = await Promise.all([
            plexUtils.getMetadata(queueItems),
            plexUtils.getMediaAlbums(queueItems),
        ]);
        return tracks.map((track, index) => {
            const album = albums.find((album) => album.src.endsWith(`:${track.parentRatingKey}`));
            return {
                ...plexUtils.createMediaItemFromTrack(track, album),
                id: nanoid(),
                linearType: LinearType.MusicTrack,
                plex: {playQueueItemID: queueItems[index].playQueueItemID},
            };
        });
    }

    async getPlayableItem(position: number): Promise<PlaylistItem | null> {
        const items = this.items as PlaylistItem[]; // Mutable.
        let item = items[position];
        if (!item) {
            return null;
        }
        try {
            if (item.playbackType === undefined) {
                const playbackType = await plexApi.getPlaybackType(item);
                item = {...item, playbackType};
                items[position] = item; // Mutate.
            }
        } catch (err) {
            logger.error(err);
        }
        return item;
    }

    private async refreshPlayQueue(): Promise<void> {
        if (this.playQueue) {
            const existingKeys = this.items.map((item) => {
                const [, , ratingKey] = item.src.split(':');
                return ratingKey;
            });
            const playQueue = await plexApi.getPlayQueue(this.playQueue.playQueueID);
            const newQueueItems = playQueue.Metadata.filter(
                (queueItem) => !existingKeys.includes(queueItem.ratingKey)
            );
            if (newQueueItems.length > 0) {
                const items = await this.createPlaylistItems(newQueueItems);
                this.items = this.items.concat(items);
            }
        }
    }

    private async skipTo(position: number): Promise<void> {
        if (position >= 0 && position < this.trackCount) {
            this.player.stop();
            this.player.autoplay = this.autoplay;
            this.position$.next(position);
            this.nowPlaying$.next(this.currentQueueItem);
            this.skip$.next();
        }
    }
}

export default new PlexRadioPlayer();
