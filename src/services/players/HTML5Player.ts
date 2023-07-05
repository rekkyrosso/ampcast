import type {Observable} from 'rxjs';
import {Subject, filter, fromEvent, map} from 'rxjs';
import Player from 'types/Player';
import embyApi from 'services/emby/embyApi';
import jellyfinApi from 'services/jellyfin/jellyfinApi';
import navidromeApi from 'services/navidrome/navidromeApi';
import subsonicApi from 'services/subsonic/subsonicApi';
import plexApi from 'services/plex/plexApi';
import {Logger} from 'utils';

export default class HTML5Player implements Player<string> {
    protected readonly logger: Logger;
    protected readonly element: HTMLMediaElement;
    protected readonly error$ = new Subject<unknown>();
    private src = '';
    autoplay = false;

    constructor(type: 'audio' | 'video', id: string) {
        const element = (this.element = document.createElement(type));

        element.hidden = true;
        element.muted = true;
        element.autoplay = false;
        element.className = `html5-${type} html5-${type}-${id}`;
        element.crossOrigin = 'anonymous';

        fromEvent(element, 'error')
            .pipe(map(() => element.error))
            .subscribe(this.error$);

        this.logger = new Logger(`HTML5Player/${type}/${id}`);

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

    load(src: string): void {
        this.logger.log('load');
        this.src = src;
        try {
            if (this.autoplay) {
                const mediaSource = this.getMediaSource(this.src);
                this.element.setAttribute('src', mediaSource);
                this.safePlay();
            }
        } catch (err) {
            this.error$.next(err);
        }
    }

    play(): void {
        this.logger.log('play');
        try {
            const mediaSource = this.getMediaSource(this.src);
            if (this.element.getAttribute('src') !== mediaSource) {
                this.element.setAttribute('src', mediaSource);
            }
            this.safePlay();
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

    private getMediaSource(src: string): string {
        const [serviceId] = src.split(':');

        switch (serviceId) {
            case 'emby':
                return embyApi.getPlayableUrlFromSrc(src);

            case 'jellyfin':
                return jellyfinApi.getPlayableUrlFromSrc(src);

            case 'navidrome':
                return navidromeApi.getPlayableUrlFromSrc(src);

            case 'plex':
                return plexApi.getPlayableUrlFromSrc(src);

            case 'subsonic':
                return subsonicApi.getPlayableUrlFromSrc(src);

            default:
                return src;
        }
    }

    private async safePlay(): Promise<void> {
        try {
            await this.element.play();
        } catch (err) {
            this.error$.next(err);
        }
    }
}
