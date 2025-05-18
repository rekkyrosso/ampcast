import type Hls from 'hls.js';
import type {HlsConfig} from 'hls.js';
import PlayableItem from 'types/PlayableItem';
import {canPlayNativeHls} from 'utils';
import audio from 'services/audio';
import HTML5Player from './HTML5Player';

export default class HLSPlayer extends HTML5Player {
    static defaultConfig: Partial<HlsConfig> = {autoStartLoad: false};
    protected config: Partial<HlsConfig> = {};
    private hasNativeSupport = canPlayNativeHls();
    private Hls: typeof Hls | null = null;
    private player: Hls | null = null;

    constructor(type: 'audio' | 'video', name = 'hls', index?: 1 | 2) {
        super(type, name, index);

        if (this.hasNativeSupport) {
            this.logger.log('Using native HLS.');
        }
    }

    // Fix for Safari. Would be nice to delete one day.
    // Audio volume is handled by a `GainNode` on other browsers.
    // But doesn't work with streamed media in Safari.
    set muted(muted: boolean) {
        super.muted = muted;
        if (this.type === 'audio' && !audio.streamingSupported) {
            this.element.muted = muted;
        }
    }

    // Fix for Safari. Would be nice to delete one day.
    // Audio volume is handled by a `GainNode` on other browsers.
    // But doesn't work with streamed media in Safari.
    set volume(volume: number) {
        super.volume = volume;
        if (this.type === 'audio' && !audio.streamingSupported) {
            this.element.volume = volume;
        }
    }

    load(item: PlayableItem): void {
        if (!this.hasNativeSupport) {
            this.loadPlayer();
        }
        super.load(item);
    }

    protected async createPlayer(): Promise<void> {
        if (this.hasNativeSupport) {
            return super.createPlayer();
        }
        if (this.player) {
            return;
        }
        const Hls = await this.loadPlayer();
        if (!Hls.isSupported()) {
            throw Error('HLS player not supported');
        }
        if (this.player) {
            return;
        }
        this.player = new Hls({
            ...HLSPlayer.defaultConfig,
            ...this.config,
        });
        this.player.on(Hls.Events.ERROR, (_, error) => {
            if (error.fatal) {
                this.player?.destroy();
                this.player = null;
                this.error$.next(error);
            } else {
                this.logger.warn('Non-fatal media error:');
                this.logger.warn(error);
            }
        });
        await this.waitForFirstLogin();
    }

    protected async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.hasNativeSupport) {
            return super.loadAndPlay(item);
        }

        if (this.loadedSrc !== item.src) {
            this.setMediaSrc(item);
            if (!this.paused) {
                this.player!.startLoad(item.startTime || 0);
            }
        }

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
        if (this.hasNativeSupport) {
            super.safePause();
        } else {
            try {
                this.element.pause();
                this.player?.stopLoad();
            } catch (err) {
                this.logger.warn(err);
            }
        }
    }

    protected async safePlay(): Promise<void> {
        if (this.hasNativeSupport) {
            super.safePlay();
        } else {
            try {
                this.player?.startLoad();
                super.safePlay();
            } catch (err) {
                if (!this.paused) {
                    this.error$.next(err);
                }
            }
        }
    }

    protected safeStop(): void {
        if (this.hasNativeSupport) {
            super.safeStop();
        } else {
            try {
                this.element.pause();
                this.element.currentTime = 0;
                this.player?.stopLoad();
            } catch (err) {
                this.logger.warn(err);
            }
        }
    }

    private setMediaSrc(item: PlayableItem): void {
        if (this.player) {
            const mediaSrc = this.getMediaSrc(item);
            this.player.stopLoad();
            this.player.detachMedia();
            this.element.removeAttribute('src');
            this.loadedSrc = '';
            this.player.loadSource(mediaSrc);
            this.player.attachMedia(this.element);
            this.loadedSrc = item.src;
        } else {
            throw Error('HLS player not loaded');
        }
    }

    private async loadPlayer(): Promise<typeof Hls> {
        if (this.Hls) {
            return this.Hls;
        }
        const {default: Hls} = await import(
            /* webpackChunkName: "hls" */
            /* webpackMode: "lazy-once" */
            'hls.js'
        );
        this.Hls = Hls;
        return Hls;
    }
}
