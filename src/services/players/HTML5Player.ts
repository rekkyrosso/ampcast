import type Hls from 'hls.js';
import type {Observable} from 'rxjs';
import {Subject, filter, fromEvent, map} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Player from 'types/Player';
import {getServiceFromSrc} from 'services/mediaServices';
import {Logger} from 'utils';

export default class HTML5Player implements Player<PlayableItem> {
    private readonly logger: Logger;
    private readonly element: HTMLMediaElement;
    private readonly error$ = new Subject<unknown>();
    private item: PlayableItem | null = null;
    private hasNativeHls = false;
    private hls: Hls | null = null;
    private hlsIsSupported = false;
    private loadedHlsSrc = '';
    private loadingHlsScript = false;
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
            .pipe(
                map(() => element.error),
                // Filter out HLS errors (handled further below).
                filter((error) => error !== null && !('fatal' in error))
            )
            .subscribe(this.error$);

        if (
            element.canPlayType('application/x-mpegURL').replace('no', '') ||
            element.canPlayType('application/vnd.apple.mpegURL').replace('no', '')
        ) {
            this.hasNativeHls = true;
        }

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
        if (this.isHlsItem && !this.hasNativeHls) {
            this.loadHlsScript();
        }
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
        this.element.pause();
        this.element.currentTime = 0;
        if (this.loadedHlsSrc) {
            this.loadedHlsSrc = '';
            this.hls!.stopLoad();
            this.hls!.detachMedia();
        }
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

    private get type(): string {
        return this.element.nodeName.toLowerCase();
    }

    private getMediaSrc(item: PlayableItem): string {
        if (item) {
            const service = getServiceFromSrc(item);
            const src = service?.getPlayableUrl?.(item) ?? item.src;
            return src;
        } else {
            throw Error('No playable item');
        }
    }

    private async safePlay(item: PlayableItem | null): Promise<void> {
        try {
            if (!item) {
                throw Error('Player not loaded');
            }
            const src = this.getMediaSrc(item);
            if (this.isHlsItem && !this.hasNativeHls) {
                if (!this.hls) {
                    this.loadHlsScript();
                    return;
                }
                if (this.hlsIsSupported) {
                    if (this.loadedHlsSrc !== src) {
                        this.loadedHlsSrc = src;
                        this.hls.stopLoad();
                        this.hls.detachMedia();
                        this.element.removeAttribute('src');
                        this.hls.loadSource(src);
                        this.hls.attachMedia(this.element);
                    }
                } else {
                    throw Error(`Unsupported ${this.type} format`);
                }
            } else {
                if (this.element.getAttribute('src') !== src) {
                    this.element.setAttribute('src', src);
                }
            }
            await this.element.play();
        } catch (err) {
            this.error$.next(err);
        }
    }

    private get isHlsItem(): boolean {
        return this.item?.playbackType === PlaybackType.HLS;
    }

    private async loadHlsScript(): Promise<void> {
        if (this.loadingHlsScript || this.hls) {
            return;
        }
        this.loadingHlsScript = true;
        const {default: Hls} = await import(
            /* webpackChunkName: "hls" */
            /* webpackMode: "lazy-once" */
            'hls.js'
        );
        this.hls = new Hls();
        this.loadingHlsScript = false;
        this.hlsIsSupported = Hls.isSupported();
        // https://github.com/video-dev/hls.js/blob/HEAD/docs/API.md#fifth-step-error-handling
        this.hls.on(Hls.Events.ERROR, (_, error) => {
            if (!this.isHlsItem) {
                return;
            }
            if (error.fatal) {
                switch (error.type) {
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        this.logger.warn('Fatal HLS media error encountered, trying to recover...');
                        this.hls!.recoverMediaError();
                        break;
                    default:
                        this.error$.next(error);
                }
            } else {
                this.logger.warn('Non-fatal HLS media error:');
                this.logger.log({error});
            }
        });
        if (this.autoplay && this.isHlsItem) {
            this.safePlay(this.item);
        }
    }
}
