import type {Observable} from 'rxjs';
import {Subject, filter, fromEvent, map} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {getServiceFromSrc} from 'services/mediaServices';
import {Logger} from 'utils';

export default class HTML5Player implements Player<PlayableItem> {
    protected readonly logger: Logger;
    protected readonly element: HTMLMediaElement;
    protected readonly error$ = new Subject<unknown>();
    protected item: PlayableItem | null = null;
    autoplay = false;

    constructor(type: 'audio' | 'video', id: string) {
        const element = (this.element = document.createElement(type));

        element.hidden = true;
        element.muted = true;
        element.autoplay = false;
        element.className = `html5-${type} html5-${type}-${id}`;
        element.crossOrigin = 'anonymous';

        this.logger = new Logger(`HTML5Player/${type}/${id}`);

        fromEvent(element, 'error')
            .pipe(map(() => element.error))
            .subscribe(this.error$);

        this.observeError().subscribe(this.logger.error);
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
        return this.element.muted;
    }

    set muted(muted: boolean) {
        this.element.muted = muted;
    }

    get volume(): number {
        return this.element.volume;
    }

    set volume(volume: number) {
        this.element.volume = volume;
    }

    observeCurrentTime(): Observable<number> {
        return fromEvent(this.element, 'timeupdate').pipe(
            map(() => this.element.currentTime),
            map((currentTime) => (isFinite(currentTime) ? currentTime : 0))
        );
    }

    observeDuration(): Observable<number> {
        return fromEvent(this.element, 'durationchange').pipe(
            map(() => this.element.duration),
            filter((duration) => isFinite(duration))
        );
    }

    observeEnded(): Observable<void> {
        return fromEvent(this.element, 'ended').pipe(map(() => undefined));
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return fromEvent(this.element, 'playing').pipe(map(() => undefined));
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        this.logger.log('load');
        this.item = item;
        try {
            if (this.autoplay) {
                this.safePlay(item);
            }
        } catch (err) {
            this.error$.next(err);
        }
    }

    play(): void {
        this.logger.log('play');
        try {
            this.safePlay(this.item);
        } catch (err) {
            this.error$.next(err);
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.element.pause();
    }

    stop(): void {
        this.logger.log('stop');
        this.element.pause();
        this.element.currentTime = 0;
    }

    seek(time: number): void {
        this.element.currentTime = time;
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }

    protected get type(): string {
        return this.element.nodeName.toLocaleLowerCase();
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
        if (!item) {
            throw Error('Player not loaded');
        }
        const src = this.getMediaSrc(item);
        if (this.element.getAttribute('src') !== src) {
            this.element.setAttribute('src', src);
        }
        try {
            await this.element.play();
        } catch (err) {
            this.error$.next(err);
        }
    }
}
