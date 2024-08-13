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
import {getServiceFromSrc, waitForLogin} from 'services/mediaServices';
import {Logger} from 'utils';

export default class HTML5Player implements Player<PlayableItem> {
    protected readonly logger = new Logger(`HTML5Player/${this.type}/${this.name}`);
    protected readonly element$ = new BehaviorSubject(document.createElement(this.type));
    protected readonly paused$ = new BehaviorSubject(true);
    protected readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    protected readonly error$ = new Subject<unknown>();
    protected hasWaited = false;
    protected loadedSrc = '';
    autoplay = false;
    #muted = true;
    #volume = 1;

    constructor(readonly type: 'audio' | 'video', readonly name: string) {
        const element = this.element;
        element.hidden = true;
        element.muted = type === 'video';
        element.volume = 1;
        element.autoplay = false;
        element.className = `html5-${type} html5-${type}-${name}`;
        element.id = `ampcast-${type}-${name}`;
        element.crossOrigin = 'anonymous';

        // Load new items.
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

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
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
                    map((currentTime) => (isFinite(currentTime) ? currentTime : 0))
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
                    filter((duration) => isFinite(duration))
                )
            )
        );
    }

    observeEnded(): Observable<void> {
        return this.element$.pipe(
            switchMap((element) => fromEvent(element, 'ended')),
            map(() => undefined)
        );
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.element$.pipe(
            switchMap((element) => fromEvent(element, 'playing')),
            map(() => undefined)
        );
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        this.logger.log('load', item.src, item.startTime);
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.safeReload(item);
        }
    }

    play(): void {
        this.logger.log('play');
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.safePlay();
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.paused$.next(true);
        this.element.pause();
    }

    stop(): void {
        this.logger.log('stop');
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
        return this.element$.getValue();
    }

    protected get item(): PlayableItem | null {
        return this.item$.value;
    }

    protected get paused(): boolean {
        return this.paused$.value;
    }

    protected get src(): string | undefined {
        return this.item?.src;
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
        // This should throw if you're not logged in.
        const service = getServiceFromSrc(item);
        const src = service?.getPlayableUrl?.(item) ?? item.src;
        return src;
    }

    protected async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.paused) {
            return;
        }
        const mediaSrc = this.getMediaSrc(item);
        if (this.element.getAttribute('src') !== mediaSrc) {
            this.element.setAttribute('src', mediaSrc);
        }
        this.element.currentTime = item.startTime || 0;
        this.loadedSrc = item.src;
        try {
            await this.element.play();
        } catch (err) {
            if (!this.paused) {
                throw err;
            }
        }
    }

    protected async safePlay(): Promise<void> {
        try {
            await this.element.play();
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
            this.logger.error(err);
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
