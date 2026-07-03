import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    filter,
    firstValueFrom,
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
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';
import observeNearEnd from 'services/mediaPlayback/players/observeNearEnd';
import {getServiceFromSrc} from 'services/mediaServices';

export default class RadioPlayer implements Player<MediaItem> {
    private readonly logger: Logger;
    private readonly station$ = new BehaviorSubject<MediaItem | null>(null);
    private readonly pager$ = new BehaviorSubject<Pager<MediaItem> | null>(null);
    private readonly paused$ = new BehaviorSubject(true);
    private readonly ended$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly skip$ = new Subject<void>();
    private readonly nowPlaying$ = new Subject<PlaylistItem | undefined>();
    private readonly position$ = new BehaviorSubject(0);
    private tracks: readonly PlaylistItem[] = [];
    private loadedSrc = '';
    #autoplay = false;

    constructor(
        name: string,
        private readonly player: Player<MediaItem>,
        readonly canPlay: (item: MediaItem) => boolean
    ) {
        const logger = (this.logger = new Logger(`RadioPlayer/${name}`));

        // Load new radio stations.
        this.observePaused()
            .pipe(
                filter((paused) => !paused),
                switchMap(() => this.observeStation()),
                switchMap((station) => {
                    if (station && station.src !== this.loadedSrc) {
                        return of(undefined).pipe(
                            mergeMap(() => this.loadAndPlay(station)),
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
                debounceTime(300),
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

        // Maintain radio `tracks`.
        this.pager$
            .pipe(
                switchMap((pager) => pager?.observeItems() || of([])),
                map((tracks) => this.createPlaylistItems(tracks)),
                tap((tracks) => (this.tracks = tracks))
            )
            .subscribe(logger);

        // Play first track.
        this.pager$
            .pipe(
                switchMap((pager) => pager?.observeItems().pipe(take(1)) || EMPTY),
                mergeMap(() => this.getPlayableItem(0)),
                tap((track) => this.loadPlayer(track))
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

    observeCanSkipNext(): Observable<boolean> {
        return combineLatest([this.position$, this.observeSize()]).pipe(
            map(([position, size]) => position < size),
            distinctUntilChanged()
        );
    }

    observeCanSkipPrev(): Observable<boolean> {
        return this.position$.pipe(
            map((position) => position !== 0),
            distinctUntilChanged()
        );
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
            map((item) => item || station)
        );
    }

    appendTo(parentElement: HTMLElement): void {
        this.player.appendTo(parentElement);
    }

    load(station: MediaItem): void {
        this.logger.log('load', station.src);
        const isLoaded = station.src === this.loadedSrc; // Do this before updating `station$` stream (synchronous).
        this.station$.next(station);
        this.paused$.next(!this.autoplay);
        if (isLoaded) {
            this.loadPlayer(this.currentTrack);
        }
    }

    play(): void {
        this.logger.log('play');
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.player.play();
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.paused$.next(true);
        this.player.pause();
    }

    stop(): void {
        this.logger.log('stop');
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
        return this.skipTo(this.position - 1);
    }

    resize(width: number, height: number): void {
        this.player.resize(width, height);
    }

    private get currentTrack(): PlaylistItem | undefined {
        return this.tracks[this.position] || undefined;
    }

    private get position(): number {
        return this.position$.value;
    }

    private get station(): MediaItem | null {
        return this.station$.value;
    }

    private get service(): MediaService | undefined {
        return this.station ? getServiceFromSrc(this.station) : undefined;
    }

    private get size(): number {
        return this.count(this.tracks);
    }

    private get src(): string | undefined {
        return this.station?.src;
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeSize(): Observable<number> {
        return this.pager$.pipe(
            switchMap((pager) => (pager ? pager.observeItems() : of([]))),
            map((items) => this.count(items)),
            distinctUntilChanged()
        );
    }

    private observeStation(): Observable<MediaItem | null> {
        return this.station$.pipe(distinctUntilChanged());
    }

    private async loadAndPlay(station: MediaItem): Promise<void> {
        // Reset state.
        this.loadedSrc = '';
        this.pager$.next(null);
        this.position$.next(0);
        if (!this.service?.createRadioPager) {
            throw Error('Radio not found');
        }
        const pager = this.service.createRadioPager(station);
        this.loadedSrc = station.src;
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
                stationName: this.station?.title,
                stationSrc: this.station?.src,
            };
        });
    }

    async getPlayableItem(position: number): Promise<PlaylistItem | undefined> {
        const items = this.tracks as PlaylistItem[]; // Mutable.
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
            this.logger.error(err);
        }
        return item;
    }

    private async skipTo(position: number): Promise<void> {
        if (position >= 0 && position < this.size) {
            this.player.stop();
            this.player.autoplay = this.autoplay;
            this.position$.next(position);
            this.nowPlaying$.next(this.currentTrack);
            this.skip$.next();
            return firstValueFrom(
                race(this.observePlaying(), this.observeError(), timer(3_000)).pipe(
                    map(() => undefined)
                )
            );
        }
    }

    private count<T>(items: readonly T[]): number {
        // Accommodate sparse arrays (`IndexedPager`).
        return items.reduce((total) => (total += 1), 0);
    }
}
