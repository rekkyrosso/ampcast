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
    takeUntil,
    delayWhen,
    race,
    timer,
    merge,
} from 'rxjs';
import {nanoid} from 'nanoid';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import Pager from 'types/Pager';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';
import HLSPlayer from 'services/mediaPlayback/players/HLSPlayer';
import HTML5Player from 'services/mediaPlayback/players/HTML5Player';
import OmniPlayer from 'services/mediaPlayback/players/OmniPlayer';
import observeNearEnd from 'services/mediaPlayback/players/observeNearEnd';
import {getServiceFromSrc} from 'services/mediaServices';

const logger = new Logger('radioPlayer');

export class RadioPlayer implements Player<PlayableItem> {
    private readonly player: OmniPlayer<PlayableItem>;
    private readonly pager$ = new BehaviorSubject<Pager<MediaItem> | null>(null);
    private readonly radio$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly paused$ = new BehaviorSubject(true);
    private readonly ended$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly skip$ = new Subject<void>();
    private readonly nowPlaying$ = new Subject<PlaylistItem | undefined>();
    private readonly position$ = new BehaviorSubject(0);
    private items: readonly PlaylistItem[] = [];
    private loadedSrc = '';
    #autoplay = false;

    constructor() {
        const hlsPlayer = new HLSPlayer('audio', 'radio-player-hls');
        const html5Player = new HTML5Player('audio', 'radio-player-html5');

        this.player = new OmniPlayer('radioPlayer');

        this.player.registerPlayers([
            [html5Player, () => true],
            [hlsPlayer, (item) => item?.playbackType === PlaybackType.HLS],
        ]);

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

        const endedOrError$ = merge(this.player.observeEnded(), this.player.observeError());

        // `ended`.
        this.pager$
            .pipe(
                switchMap((pager) => (pager ? endedOrError$ : EMPTY)),
                map(() => this.position >= this.size - 1),
                filter((atEnd) => atEnd),
                tap(() => this.ended$.next())
            )
            .subscribe(logger);

        // Load next radio track.
        this.pager$
            .pipe(
                switchMap((pager) => (pager ? endedOrError$ : EMPTY)),
                map(() => this.position + 1),
                filter((position) => position < this.size),
                tap(this.position$),
                mergeMap((position) => this.getPlayableItem(position)),
                tap((item) => this.loadPlayer(item))
            )
            .subscribe(logger);

        // Delay loading after skipping.
        this.pager$
            .pipe(
                switchMap((pager) => (pager ? this.skip$ : EMPTY)),
                debounceTime(500),
                map(() => this.position),
                mergeMap((position) => this.getPlayableItem(position)),
                tap((item) => this.loadPlayer(item))
            )
            .subscribe(logger);

        // Prepare next track.
        this.pager$
            .pipe(
                switchMap((pager) => (pager ? observeNearEnd(this, 10) : EMPTY)),
                filter((nearEnd) => nearEnd),
                map(() => this.position + 1),
                filter((position) => position < this.size),
                mergeMap((position) => this.getPlayableItem(position))
            )
            .subscribe(logger);

        // Maintain `items`.
        this.pager$
            .pipe(
                switchMap((pager) => pager?.observeItems() || of([])),
                map((items) => this.createPlaylistItems(items)),
                tap((items) => (this.items = items))
            )
            .subscribe(logger);

        // Play first track.
        this.pager$
            .pipe(
                switchMap((pager) => pager?.observeItems().pipe(take(1)) || EMPTY),
                mergeMap(() => this.getPlayableItem(0)),
                tap((item) => this.loadPlayer(item))
            )
            .subscribe(logger);

        // Keep the pager in synch.
        this.pager$
            .pipe(
                switchMap((pager) =>
                    pager
                        ? this.position$.pipe(
                              delayWhen(() => race(this.observePlaying(), timer(500))),
                              debounceTime(500),
                              tap((position) => pager.fetchAt(position))
                          )
                        : EMPTY
                )
            )
            .subscribe(logger);

        // Catch initial pager error.
        this.pager$
            .pipe(
                switchMap((pager) =>
                    pager ? pager.observeError().pipe(takeUntil(pager.observeItems())) : EMPTY
                ),
                tap((error) => this.error$.next(error))
            )
            .subscribe(logger);

        // Log player errors.
        this.pager$
            .pipe(switchMap((pager) => (pager ? this.player.observeError() : EMPTY)))
            .subscribe(logger.error);
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

    observeNowPlaying(station: PlaylistItem): Observable<PlaylistItem> {
        return this.nowPlaying$.pipe(
            map((item) => (this.src === station.src ? item : null)),
            distinctUntilChanged(),
            map((item) =>
                item ? {...item, stationName: station.title, stationSrc: station.src} : station
            )
        );
    }

    appendTo(parentElement: HTMLElement): void {
        this.player.appendTo(parentElement);
    }

    load(radio: PlayableItem): void {
        logger.log('load', radio.src);
        const isLoaded = radio.src === this.loadedSrc; // Do this before updating `radio$` stream (synchronous).
        this.radio$.next(radio);
        this.paused$.next(!this.autoplay);
        if (isLoaded) {
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

    private get currentQueueItem(): PlaylistItem | undefined {
        return this.items[this.position] || undefined;
    }

    private get position(): number {
        return this.position$.value;
    }

    private get radio(): PlayableItem | null {
        return this.radio$.value;
    }

    private get service(): MediaService | undefined {
        return this.radio ? getServiceFromSrc(this.radio) : undefined;
    }

    private get size(): number {
        // Accommodate sparse arrays (`IndexedPager`).
        return this.items.reduce((total) => (total += 1), 0);
    }

    private get src(): string | undefined {
        return this.radio?.src;
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeRadio(): Observable<PlayableItem | null> {
        return this.radio$.pipe(distinctUntilChanged());
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        // Reset state.
        this.loadedSrc = '';
        this.pager$.next(null);
        this.position$.next(0);
        if (!this.service?.createRadioPager) {
            throw Error('Radio not found');
        }
        const pager = this.service.createRadioPager(item.src);
        this.loadedSrc = item.src;
        this.pager$.next(pager);
        this.position$.next(0); // Start fetching radio tracks.
    }

    private loadPlayer(item: PlaylistItem | undefined): void {
        if (item) {
            this.player.load(item);
            this.nowPlaying$.next(item);
        } else {
            this.error$.next('No media source');
        }
    }

    private createPlaylistItems(items: readonly MediaItem[]): readonly PlaylistItem[] {
        return items.map((item) => {
            return {
                ...item,
                id: nanoid(),
                linearType: LinearType.MusicTrack,
            };
        });
    }

    async getPlayableItem(position: number): Promise<PlaylistItem | undefined> {
        const items = this.items as PlaylistItem[]; // Mutable.
        let item = items[position];
        if (!item) {
            return;
        }
        try {
            if (item.playbackType === undefined) {
                const playbackType = await this.service?.getPlaybackType?.(item);
                item = {...item, playbackType};
                items[position] = item; // Mutate.
            }
        } catch (err) {
            logger.error(err);
        }
        return item;
    }

    private async skipTo(position: number): Promise<void> {
        if (position >= 0 && position < this.size) {
            this.player.stop();
            this.player.autoplay = this.autoplay;
            this.position$.next(position);
            this.nowPlaying$.next(this.currentQueueItem);
            this.skip$.next();
        }
    }
}

export default new RadioPlayer();
