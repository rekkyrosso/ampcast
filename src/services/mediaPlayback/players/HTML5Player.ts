import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    distinctUntilChanged,
    filter,
    fromEvent,
    map,
    mergeMap,
    of,
    skipWhile,
    startWith,
    switchMap,
    take,
    tap,
} from 'rxjs';
import MediaService from 'types/MediaService';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {Logger} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {getServiceFromSrc, waitForLogin} from 'services/mediaServices';

export default class HTML5Player implements Player<PlayableItem> {
    protected readonly logger: Logger;
    protected readonly element$ = new BehaviorSubject(document.createElement(this.type));
    protected readonly paused$ = new BehaviorSubject(true);
    protected readonly playing$ = new Subject<void>();
    protected readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    protected readonly error$ = new Subject<unknown>();
    protected hasWaited = false;
    protected loadedSrc = '';
    protected stopped = false;
    autoplay = false;
    #muted = true;
    #volume = 1;

    constructor(readonly type: 'audio' | 'video', name: string, index?: 1 | 2) {
        this.logger = new Logger(`HTML5Player/${this.type}/${name}${index ? '-' + index : ''}`);

        const element = this.element;
        element.hidden = true;
        element.muted = type === 'video';
        element.volume = 1;
        element.autoplay = false;
        element.preload = 'metadata';
        element.className = `html5-${type} html5-${type}-${name}`;
        if (index) {
            element.id = `html5-${type}-${name}-${index}`;
        }
        element.crossOrigin = 'anonymous';

        // Load new items.
        this.observePaused()
            .pipe(
                filter((paused) => !paused || index === 2),
                take(1),
                switchMap(() => this.observeItem()),
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
            .subscribe(this.logger);

        this.element$
            .pipe(
                switchMap((element) =>
                    fromEvent(element, 'error').pipe(
                        map(() => element.error),
                        tap((error) => this.error$.next(error))
                    )
                )
            )
            .subscribe(this.logger);

        // Stop and emit an error on logout.
        this.observeService()
            .pipe(
                switchMap((service) => (service ? service.observeIsLoggedIn() : EMPTY)),
                skipWhile((isLoggedIn) => !isLoggedIn),
                filter((isLoggedIn) => !isLoggedIn),
                tap(() => this.error$.next(Error('Not logged in'))),
                tap(() => this.stop())
            )
            .subscribe(this.logger);

        // Log errors.
        this.error$.subscribe(this.logger.error);
    }

    get currentTime(): number {
        return this.element.currentTime;
    }

    get duration(): number {
        return this.element.duration;
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
    }

    get item(): PlayableItem | null {
        return this.item$.value;
    }

    get loop(): boolean {
        return this.element.loop;
    }

    set loop(loop: boolean) {
        this.element.loop = loop;
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        this.#muted = muted;
        if (this.type === 'video') {
            // Audio volume is handled by a `GainNode`.
            this.element.muted = muted;
        }
    }

    get src(): string | undefined {
        return this.item?.src;
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        this.#volume = volume;
        if (this.type === 'video') {
            // Audio volume is handled by a `GainNode`.
            this.element.volume = volume;
        }
    }

    observeCurrentTime(): Observable<number> {
        return this.element$.pipe(
            switchMap((element) =>
                fromEvent(element, 'timeupdate').pipe(
                    startWith(element),
                    map(() => element.currentTime),
                    map((currentTime) =>
                        this.stopped ? 0 : isFinite(currentTime) ? currentTime : 0
                    )
                )
            )
        );
    }

    observeDuration(): Observable<number> {
        return this.element$.pipe(
            switchMap((element) =>
                fromEvent(element, 'durationchange').pipe(
                    startWith(element),
                    map(() => element.duration),
                    map((duration) =>
                        this.isInfiniteStream
                            ? MAX_DURATION
                            : isNaN(duration)
                            ? this.item?.duration || 0
                            : duration
                    )
                )
            )
        );
    }

    observeEnded(): Observable<void> {
        return this.element$.pipe(
            switchMap((element) => fromEvent(element, 'ended')),
            tap(() => {
                if (this.isInfiniteStream) {
                    this.logger.warn('Ended event for infinite stream.');
                }
            }),
            filter(() => !this.isInfiniteStream),
            map(() => undefined)
        );
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.playing$;
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        this.logger.log('load', item.src);
        if (this.autoplay) {
            this.stopped = false;
        }
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.safeReload(item);
        }
    }

    play(): void {
        this.logger.log('play');
        this.stopped = false;
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.safePlay();
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.paused$.next(true);
        this.safePause();
    }

    stop(): void {
        this.logger.log('stop');
        this.stopped = true;
        this.paused$.next(true);
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
        this.safeStop();
    }

    seek(time: number): void {
        this.element.currentTime = time;
    }

    resize(width: number, height: number): void {
        if (this.type === 'video') {
            this.element.style.width = `${width}px`;
            this.element.style.height = `${height}px`;
        }
    }

    protected get element(): HTMLMediaElement {
        return this.element$.value;
    }

    protected get isInfiniteStream(): boolean {
        return (
            this.element.duration === Infinity || this.src?.startsWith('internet-radio:') || false
        );
    }

    protected get paused(): boolean {
        return this.paused$.value;
    }

    protected observeItem(): Observable<PlayableItem | null> {
        return this.item$.pipe(distinctUntilChanged());
    }

    protected observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    protected observeService(): Observable<MediaService | undefined> {
        return this.observeItem().pipe(
            map((item) => (item ? getServiceFromSrc(item) : undefined)),
            distinctUntilChanged()
        );
    }

    protected async createPlayer(): Promise<void> {
        // No special player for basic `HTML5Player`.
        if (!this.hasWaited) {
            await this.waitForFirstLogin();
        }
    }

    protected getMediaSrc(item: PlayableItem): string {
        const service = getServiceFromSrc(item);
        // This should throw if you're not logged in.
        const src = service?.getPlayableUrl?.(item) ?? item.src;
        if (!src) {
            throw Error('No media source');
        }
        return src;
    }

    protected async loadAndPlay(item: PlayableItem): Promise<void> {
        const mediaSrc = this.getMediaSrc(item);
        if (this.element.getAttribute('src') !== mediaSrc) {
            this.element.setAttribute('src', mediaSrc);
        }
        this.loadedSrc = item.src;
        if (!this.paused && this.element.paused) {
            this.element.currentTime = item.startTime || 0;
            try {
                await this.element.play();
                this.playing$.next();
            } catch (err) {
                if (!this.paused) {
                    throw err;
                }
            }
        }
    }

    protected safePause(): void {
        this.element.pause();
    }

    protected async safePlay(): Promise<void> {
        try {
            if (this.element.paused) {
                await this.element.play();
            } else {
                // Emitting `playing` needs to be async.
                await Promise.resolve();
            }
            this.playing$.next();
        } catch (err) {
            if (!this.paused) {
                this.error$.next(err);
            }
        }
    }

    protected async safeReload(item: PlayableItem): Promise<void> {
        this.element.currentTime = item.startTime || 0;
        if (this.autoplay) {
            await this.safePlay();
        }
    }

    protected safeStop(): void {
        try {
            this.element.pause();
            this.element.load();
        } catch (err) {
            this.logger.warn(err);
        }
    }

    protected async waitForFirstLogin(): Promise<void> {
        if (!this.hasWaited && this.item) {
            const [serviceId] = this.item.src.split(':');
            await waitForLogin(serviceId, 3000);
            this.hasWaited = true;
        }
    }
}
