import type Hls from 'hls.js';
import PlayableItem from 'types/PlayableItem';
import audio from 'services/audio';
import HTML5Player from './HTML5Player';

export default class HLSPlayer extends HTML5Player {
    private readonly maxFatalErrors = 3;
    private hasNativeSupport = false;
    private player: Hls | null = null;
    private loadedSrc = '';
    private scriptLoading = false;
    private scriptLoaded = false;
    private errorCount = 0;

    constructor(type: 'audio' | 'video', name = 'hls') {
        super(type, name);

        if (
            this.element.canPlayType('application/x-mpegURL').replace('no', '') ||
            this.element.canPlayType('application/vnd.apple.mpegURL').replace('no', '')
        ) {
            this.logger.log('Using native HLS.');
            this.hasNativeSupport = true;
        }
    }

    // Fix for Safari. Would be nice to delete one day.
    // Audio volume is handled by a `GainNode` on other browsers.
    set muted(muted: boolean) {
        super.muted = muted;
        if (this.type === 'audio' && !audio.streamingSupported) {
            this.element.muted = muted;
        }
    }

    // Fix for Safari. Would be nice to delete one day.
    // Audio volume is handled by a `GainNode` on other browsers.
    set volume(volume: number) {
        super.volume = volume;
        if (this.type === 'audio' && !audio.streamingSupported) {
            this.element.volume = volume;
        }
    }

    load(item: PlayableItem): void {
        if (this.hasNativeSupport) {
            super.load(item);
        } else {
            this.logger.log('load');
            this.item = item;
            this.loadScript();
            if (this.autoplay) {
                this.safePlay(item);
            }
        }
    }

    stop(): void {
        this.stopped = true;
        if (this.hasNativeSupport) {
            super.stop();
        } else {
            this.logger.log('stop');
            this.element.pause();
            this.element.currentTime = 0;
            if (this.loadedSrc) {
                this.loadedSrc = '';
                this.player!.stopLoad();
                this.player!.detachMedia();
                this.element.removeAttribute('src');
            }
        }
    }

    protected async safePlay(item: PlayableItem | null): Promise<void> {
        this.stopped = false;
        if (this.hasNativeSupport) {
            super.safePlay(item);
        } else {
            try {
                if (!item) {
                    throw Error('Player not loaded');
                }
                if (!this.scriptLoaded) {
                    this.loadScript();
                    return;
                }
                if (this.player) {
                    const src = this.getMediaSrc(item);
                    if (this.loadedSrc !== src) {
                        this.player.stopLoad();
                        this.player.detachMedia();
                        this.element.removeAttribute('src');
                        this.player.loadSource(src);
                        this.player.attachMedia(this.element);
                        this.loadedSrc = src;
                    }
                } else {
                    throw Error(`Unsupported ${this.type} format`);
                }
                this.errorCount = 0;
                await this.element.play();
            } catch (err) {
                this.error$.next(err);
            }
        }
    }

    private async loadScript(): Promise<void> {
        if (this.scriptLoading || this.scriptLoaded) {
            return;
        }
        this.scriptLoading = true;
        const {default: Hls} = await import(
            /* webpackChunkName: "hls" */
            /* webpackMode: "lazy-once" */
            'hls.js'
        );
        this.scriptLoading = false;
        this.scriptLoaded = true;
        if (Hls.isSupported()) {
            this.player = new Hls();
            // https://github.com/video-dev/hls.js/blob/HEAD/docs/API.md#fifth-step-error-handling
            this.player.on(Hls.Events.ERROR, (_, error) => {
                if (error.fatal) {
                    switch (error.type) {
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            if (this.errorCount < this.maxFatalErrors) {
                                this.errorCount++;
                                this.logger.warn(
                                    'Fatal media error encountered, trying to recover...'
                                );
                                this.player!.recoverMediaError();
                            } else {
                                this.error$.next(error);
                            }
                            break;

                        default:
                            this.error$.next(error);
                    }
                } else {
                    if (this.errorCount < this.maxFatalErrors) {
                        this.logger.warn('Non-fatal media error:');
                        this.logger.warn(error);
                    }
                }
            });
        }
        if (this.autoplay && this.item) {
            this.safePlay(this.item);
        }
    }
}
