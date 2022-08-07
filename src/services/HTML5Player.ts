import type {Observable} from 'rxjs';
import {fromEvent, Subject} from 'rxjs';
import {map} from 'rxjs/operators';
import Player from 'types/Player';
import jellyfinApi from 'services/jellyfin/jellyfinApi';
import plexApi from 'services/plex/plexApi';
import {Logger} from 'utils';

export default class HTML5Player implements Player<string> {
    private readonly element: HTMLMediaElement;
    private readonly error$ = new Subject<unknown>();
    public readonly autoplay = false;

    constructor(type: 'audio' | 'video') {
        const player = (this.element = document.createElement(type));

        player.hidden = true;
        player.muted = true;
        player.autoplay = false;
        player.className = `html5-${type}`;
        player.crossOrigin = 'anonymous';

        fromEvent(player, 'error')
            .pipe(map(() => player.error))
            .subscribe(this.error$);

        const logger = new Logger(`HTML5Player.${type}`);

        this.observeError().subscribe(logger.error);
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
            map((duration) => (isFinite(duration) ? duration : 0))
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

    load(src: string): void {
        if (src) {
            this.element.setAttribute('src', this.getMediaSource(src));
            if (this.autoplay) {
                this.play();
            }
        }
    }

    play(): void {
        if (this.element.error) {
            this.error$.next(this.element.error);
        } else {
            this.element.play().then(undefined, (err) => this.error$.next(err));
        }
    }

    pause(): void {
        this.element.pause();
    }

    stop(): void {
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

    private getMediaSource(src: string): string {
        if (src.startsWith('jellyfin:')) {
            return jellyfinApi.getPlayableUrlFromSrc(src);
        } else if (src.startsWith('plex:')) {
            return plexApi.getPlayableUrlFromSrc(src);
        } else {
            return src;
        }
    }
}
