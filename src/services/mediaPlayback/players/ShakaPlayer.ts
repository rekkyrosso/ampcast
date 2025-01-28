import type shaka from 'shaka-player/dist/shaka-player.compiled';
import PlayableItem from 'types/PlayableItem';
import audio from 'services/audio';
import {getServiceFromSrc} from 'services/mediaServices';
import HTML5Player from './HTML5Player';

// This is currently only used for DASH audio.

export default class ShakaPlayer extends HTML5Player {
    private hasNativeSupport = false;
    private shaka: typeof shaka | null = null;
    private player: shaka.Player | null = null;
    private onError = (err: unknown) => this.error$.next(err);

    constructor(type: 'audio' | 'video', name = 'shaka', index?: 1 | 2) {
        super(type, name, index);

        if (this.element.canPlayType('application/dash+xml').replace('no', '')) {
            this.logger.log('Using native DASH.');
            this.hasNativeSupport = true;
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
        const shaka = await this.loadPlayer();
        if (!shaka.Player.isBrowserSupported()) {
            throw Error('Shaka player not supported');
        }
        if (this.player) {
            return;
        }
        this.player = new shaka.Player();
        await this.player.attach(this.element);
        this.player.addEventListener('error', this.onError);
        await this.waitForFirstLogin();
    }

    protected async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.hasNativeSupport) {
            return super.loadAndPlay(item);
        }
        if (this.player) {
            if (this.loadedSrc !== item.src) {
                if (this.loadedSrc) {
                    // This seems to be required by Firefox DRM.
                    // I can't work out a way round it.
                    await this.recreatePlayer();
                }
                const mediaSrc = this.getMediaSrc(item);
                const drm = this.getDrmConfig(item);
                const streaming = this.getStreamingConfig();
                this.player.configure({drm, streaming});
                await this.player.load(mediaSrc);
                this.loadedSrc = item.src;
            }
        } else {
            throw Error('Shaka player not loaded');
        }
        if (!this.paused && this.element.paused && this.src === item.src) {
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

    protected safeStop(): void {
        this.element.pause();
        this.element.currentTime = 0;
    }

    private getDrmConfig(item: PlayableItem): Record<string, any> {
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
    }

    private getStreamingConfig(): Record<string, any> {
        return {
            bufferingGoal: 10,
            retryParameters: {
                maxAttempts: Infinity,
                timeout: 10_000,
            },
            stallSkip: 0.1,
        };
    }

    private async loadPlayer(): Promise<typeof shaka> {
        if (this.shaka) {
            return this.shaka;
        }
        const {default: shaka} = await import(
            /* webpackChunkName: "shaka-player" */
            /* webpackMode: "lazy-once" */
            'shaka-player/dist/shaka-player.compiled'
        );
        shaka.polyfill.installAll();
        this.shaka = shaka;
        return shaka;
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
        this.element.replaceWith(element);
        this.element$.next(element);
    }
}
