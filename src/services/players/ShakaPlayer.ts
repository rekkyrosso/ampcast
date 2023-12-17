import {filter, type Observable} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import audio from 'services/audio';
import {getServiceFromSrc} from 'services/mediaServices';
import HTML5Player from './HTML5Player';

// This is currently only used for DASH audio.

export default class ShakaPlayer extends HTML5Player {
    private hasNativeSupport = false;
    private shaka: typeof shaka | null = null;
    private player: shaka.Player | null = null;
    private loadedSrc = '';
    private scriptLoading = false;
    private scriptLoaded = false;
    private hasPlayed = false;

    constructor(type: 'audio' | 'video', name = 'shaka') {
        super(type, name);

        if (this.element.canPlayType('application/dash+xml').replace('no', '')) {
            this.logger.log('Using native DASH.');
            this.hasNativeSupport = true;
        }
    }

    // Fix for Safari. Would be nice to delete one day.
    set muted(muted: boolean) {
        super.muted = muted;
        if (this.type === 'audio' && !audio.streamingSupported) {
            this.element.muted = muted;
        }
    }

    // Fix for Safari. Would be nice to delete one day.
    set volume(volume: number) {
        super.volume = volume;
        if (this.type === 'audio' && !audio.streamingSupported) {
            this.element.volume = volume;
        }
    }

    observePlaying(): Observable<void> {
        return super.observePlaying().pipe(filter(() => this.hasPlayed));
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
                        // TODO: It would be nice to delete this.
                        if (this.loadedSrc) {
                            // This seems to be required by Firefox.
                            // Had this problem with both `shaka-player` and `dashjs`.
                            await this.recreatePlayer();
                        }
                        const drm = this.getDrmConfig(item);
                        const streaming = this.getStreamingConfig();
                        this.player.configure({drm, streaming});
                        await this.player.load(src);
                        this.loadedSrc = src;
                    }
                } else {
                    throw Error(`Unsupported ${this.type} format`);
                }

                if (this.autoplay && this.item === item) {
                    await this.element.play();

                    if (!this.hasPlayed && this.item === item) {
                        // This doesn't really fix any bugs but seems right.
                        // `playing` emits too early otherwise.
                        this.hasPlayed = true;
                        this.playing$.next(undefined);
                    }
                }
            } catch (err: any) {
                if (err.name === 'AbortError' || this.item !== item) {
                    // `stop()` was called during call to `play()`
                    this.logger.warn(err);
                } else {
                    this.error$.next(err);
                }
            }
        }
    }

    private getDrmConfig(item: PlayableItem): Record<string, any> {
        if (item) {
            const config: Record<string, any> = {};
            const service = getServiceFromSrc(item);
            const drm = service?.getDrmInfo?.(item);
            if (drm) {
                config.servers = {
                    [drm.keySystem]: drm.license,
                };
                if (drm.type === 'fairplay') {
                    config.advanced = {
                        [drm.keySystem]: {
                            serverCertificateUri: drm.certificate,
                        },
                    };
                    config.initDataTransform = (
                        initData: ArrayBuffer,
                        initDataType: string,
                        drmInfo: shaka.extern.DrmInfo
                    ) => {
                        if (initDataType !== 'skd') {
                            return initData;
                        }
                        const util = this.shaka!.util;
                        const contentId = util.StringUtils.fromBytesAutoDetect(initData).replace(
                            'skd://',
                            ''
                        );
                        return util.FairPlayUtils.initDataTransform(
                            initData,
                            contentId,
                            drmInfo.serverCertificate
                        );
                    };
                }
            }
            return config;
        } else {
            throw Error('No playable item');
        }
    }

    private getStreamingConfig(): Record<string, any> {
        return {
            bufferingGoal: 10,
            jumpLargeGaps: true,
            retryParameters: {
                maxAttempts: Infinity,
                timeout: 10_000,
            },
            stallSkip: 0.1,
        };
    }

    private async loadScript(): Promise<void> {
        if (this.scriptLoading || this.scriptLoaded) {
            return;
        }
        this.scriptLoading = true;
        const {default: shaka} = await import(
            /* webpackChunkName: "shaka-player" */
            /* webpackMode: "lazy-once" */
            'shaka-player/dist/shaka-player.compiled'
        );
        this.scriptLoading = false;
        this.scriptLoaded = true;
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            this.shaka = shaka;
            this.player = new shaka.Player();
            await this.player.attach(this.element);
            this.player.addEventListener('error', this.onError);
        }
        if (this.autoplay && this.item) {
            this.safePlay(this.item);
        }
    }

    private async recreatePlayer(): Promise<void> {
        const {hidden, loop, muted, volume} = this.element;
        const element = this.element.cloneNode() as HTMLMediaElement;
        element.removeAttribute('src');
        Object.assign(element, {hidden, loop, muted, volume});
        this.player?.removeEventListener('error', this.onError);
        await this.player?.unload();
        await this.player?.destroy();
        this.player = new this.shaka!.Player();
        await this.player.attach(element);
        this.player.addEventListener('error', this.onError);
        this.loadedSrc = '';
        this.hasPlayed = false;
        this.element.replaceWith(element);
        this.element$.next(element);
    }

    private onError = (err: unknown) => {
        this.error$.next(err);
    };
}
