import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, filter, fromEvent, map, startWith, switchMap} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {getServiceFromSrc} from 'services/mediaServices';
import {Logger} from 'utils';

export default class HTML5Player implements Player<PlayableItem> {
    protected readonly logger = new Logger(`HTML5Player/${this.type}/${this.name}`);
    protected readonly element$ = new BehaviorSubject(document.createElement(this.type));
    protected readonly error$ = new Subject<unknown>();
    protected readonly playing$ = new Subject<void>();
    protected item: PlayableItem | null = null;
    protected stopped = true;
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

        this.element$
            .pipe(
                switchMap((element) =>
                    fromEvent(element, 'error').pipe(
                        map(() => element.error),
                        // TODO: Leaky abstraction.
                        // Filter out `HLSPlayer` errors.
                        filter((error) => error !== null && !('fatal' in error))
                    )
                )
            )
            .subscribe(this.error$);

        this.element$
            .pipe(
                switchMap((element) => fromEvent(element, 'playing')),
                map(() => undefined)
            )
            .subscribe(this.playing$);

        this.error$.subscribe((err) => {
            if (this.stopped) {
                this.logger.warn({err});
            } else {
                this.logger.error(err);
            }
        });
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
        return this.error$.pipe(filter(() => !this.stopped));
    }

    observePlaying(): Observable<void> {
        return this.playing$.pipe(filter(() => !this.stopped));
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        this.logger.log('load');
        this.item = item;
        if (this.autoplay) {
            this.safePlay(item);
        }
    }

    play(): void {
        this.logger.log('play');
        this.safePlay(this.item);
    }

    pause(): void {
        this.logger.log('pause');
        this.element.pause();
    }

    stop(): void {
        this.logger.log('stop');
        this.stopped = true;
        this.element.pause();
        this.element.currentTime = 0;
        this.element.removeAttribute('src');
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

    protected getMediaSrc(item: PlayableItem): string {
        if (item) {
            const service = getServiceFromSrc(item);
            const src = service?.getPlayableUrl?.(item) ?? item.src;
            return src;
        } else {
            throw Error('No playable item');
        }
    }

    protected async safePlay(item: PlayableItem | null): Promise<void> {
        this.stopped = false;
        try {
            if (!item) {
                throw Error('Player not loaded');
            }
            const src = this.getMediaSrc(item);
            if (this.element.getAttribute('src') !== src) {
                this.element.setAttribute('src', src);
            }
            await this.element.play();
        } catch (err) {
            this.error$.next(err);
        }
    }
}
