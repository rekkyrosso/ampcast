import type Hls from 'hls.js';
import PlayableItem from 'types/PlayableItem';
import HTML5Player from './HTML5Player';

class HlsPlayer extends HTML5Player {
    private loadedSrc = '';
    private hls: Hls | null = null;
    private isSupported = false;
    private loading = false;

    constructor() {
        super('video', 'hls');
    }

    load(item: PlayableItem): void {
        if (!this.hls) {
            this.loadScript();
        }
        super.load(item);
    }

    protected async safePlay(item: PlayableItem | null): Promise<void> {
        if (!item) {
            throw Error('Player not loaded');
        }
        if (!this.hls) {
            this.loadScript();
            return;
        }
        if (this.isSupported) {
            const src = this.getMediaSrc(item);
            if (this.loadedSrc !== src) {
                this.loadedSrc = src;
                this.hls.stopLoad();
                this.hls.detachMedia();
                this.hls.loadSource(src);
                this.hls.attachMedia(this.element);
            }
        } else {
            throw Error('Unsupported video format');
        }
        try {
            await this.element.play();
        } catch (err) {
            this.error$.next(err);
        }
    }

    private async loadScript(): Promise<void> {
        if (this.loading) {
            return;
        }
        this.loading = true;
        const {default: Hls} = await import(
            /* webpackChunkName: "hls" */
            /* webpackMode: "lazy-once" */
            'hls.js'
        );
        this.hls = new Hls();
        this.isSupported = Hls.isSupported();
        // https://github.com/video-dev/hls.js/blob/HEAD/docs/API.md#fifth-step-error-handling
        this.hls.on(Hls.Events.ERROR, (_, data) => this.error$.next(data));
        if (this.autoplay && this.item) {
            this.safePlay(this.item);
        }
    }
}

export default new HlsPlayer();
