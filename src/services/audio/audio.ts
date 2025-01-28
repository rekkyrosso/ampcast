import {combineLatest, distinctUntilChanged, filter, map, pairwise, startWith, tap} from 'rxjs';
import AudioManager from 'types/AudioManager';
import AudioSettings from 'types/AudioSettings';
import MediaType from 'types/MediaType';
import PlaybackState from 'types/PlaybackState';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import ServiceType from 'types/ServiceType';
import {Logger, browser, exists} from 'utils';
import {observeCurrentItem, observePlaybackState} from 'services/mediaPlayback/playback';
import mediaPlaybackSettings from 'services/mediaPlayback/mediaPlaybackSettings';
import {getServiceFromSrc} from 'services/mediaServices';
import OmniAudioContext from './OmniAudioContext';
import {observeAudioSettings} from './audioSettings';

const logger = new Logger('audio');

class Audio implements AudioManager {
    #sourceNodes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
    #context = new OmniAudioContext({latencyHint: 'playback'});
    #input = this.#context.createDelay();
    #replayGain = this.#context.createGain();
    #output = this.#context.createGain();

    // Safari doesn't currently support web audio for streamed media.
    // https://developer.apple.com/forums/thread/56362
    readonly streamingSupported = browser.name !== 'safari';

    constructor() {
        this.#output.gain.value = mediaPlaybackSettings.volume;
        this.#input.connect(this.#replayGain);
        this.#replayGain.connect(this.#output);
        this.#output.connect(this.#context.destination);

        // Map the current <audio> element to a source node that can be used by analysers.
        observePlaybackState()
            .pipe(
                map((state) => this.getCurrentlyPlaying(state)),
                filter(exists),
                map((item) => this.getSourceNode(item)),
                startWith(undefined),
                distinctUntilChanged(),
                pairwise(),
                tap(([prevSourceNode, nextSourceNode]) => {
                    prevSourceNode?.disconnect(this.#input);
                    nextSourceNode?.connect(this.#input);
                })
            )
            .subscribe(logger);

        // Calculate `replayGain`.
        combineLatest([observeCurrentItem(), observeAudioSettings()])
            .pipe(
                map(([item, settings]) => this.calculateReplayGain(item, settings)),
                distinctUntilChanged(),
                tap((value) => (this.#replayGain.gain.value = value))
            )
            .subscribe(logger);
    }

    get context(): AudioContext {
        return this.#context;
    }

    get replayGain(): number {
        return this.#replayGain.gain.value;
    }

    get source(): AudioNode {
        return this.#input;
    }

    get volume(): number {
        return this.#output.gain.value;
    }

    set volume(volume: number) {
        this.#output.gain.value = volume;
    }

    private calculateReplayGain(
        item: PlaylistItem | null,
        {replayGainMode, replayGainPreAmp}: AudioSettings
    ): number {
        if (!item || !replayGainMode) {
            return 1;
        }

        // TODO: Maybe add some form of preAmp for public media.
        // That might enable volume levelling across services.
        const service = getServiceFromSrc(item);
        if (service?.serviceType === ServiceType.PublicMedia) {
            return 1;
        }

        const {albumGain, albumPeak, trackGain, trackPeak} = item;
        const isAlbumMode = replayGainMode === 'album';
        // prettier-ignore
        const gain = isAlbumMode ? (albumGain ?? trackGain) : (trackGain ?? albumGain);
        const peak = (isAlbumMode ? albumPeak ?? trackPeak : trackPeak ?? albumPeak) ?? 1;
        const preventClipping = true;

        if (gain == null) {
            return 1;
        }

        // https://wiki.hydrogenaud.io/?title=ReplayGain
        let replayGain = 10 ** ((gain + replayGainPreAmp) / 20);
        if (preventClipping) {
            replayGain = Math.min(replayGain, 1 / peak);
        }
        return replayGain;
    }

    private appleStarted = false;
    private getCurrentlyPlaying({currentItem, startedAt}: PlaybackState): PlaylistItem | null {
        // Attaching audio nodes to Apple Music's audio element before it is
        // initialised causes playback errors in Firefox.
        if (!this.appleStarted && currentItem?.src.startsWith('apple:')) {
            if (startedAt === 0) {
                return null;
            } else {
                this.appleStarted = true;
            }
        }
        return currentItem;
    }

    private getSourceNode(item: PlaylistItem): MediaElementAudioSourceNode | undefined {
        const createSourceNode = (audio: HTMLAudioElement) => {
            if (!this.#sourceNodes.has(audio)) {
                const sourceNode = this.context!.createMediaElementSource(audio);
                this.#sourceNodes.set(audio, sourceNode);
            }
        };
        // Create these source nodes as early as possible.
        // Avoids an audible glitch for the first gapless playback transition.
        const audios = document.querySelectorAll<HTMLAudioElement>('.html5-audio-main');
        for (const audio of audios) {
            createSourceNode(audio);
        }
        const audio = this.getAudioElement(item);
        if (audio) {
            createSourceNode(audio);
            return this.#sourceNodes.get(audio);
        }
    }

    private getAudioElement(item: PlaylistItem): HTMLAudioElement | null {
        if (this.canUseWebAudio(item)) {
            const selector = this.getAudioElementSelector(item);
            if (selector) {
                return document.querySelector<HTMLAudioElement>(selector);
            }
        }
        return null;
    }

    private canUseWebAudio(item: PlaylistItem): boolean {
        return (
            item.mediaType === MediaType.Audio &&
            item.playbackType !== PlaybackType.IFrame &&
            (this.streamingSupported || !this.isStreamed(item))
        );
    }

    private getAudioElementSelector(item: PlaylistItem): string {
        if (item.src.startsWith('apple:')) {
            return 'audio#apple-music-player';
        } else if (item.src.startsWith('tidal:')) {
            return '#tidal-player-root #video-one';
        } else {
            switch (item.playbackType) {
                case PlaybackType.DASH:
                    return '.html5-audio-dash';

                case PlaybackType.HLS:
                    return '.html5-audio-hls';

                default:
                    return '.dual-audio-main.player-1>#html5-audio-main-1,.dual-audio-main.player-2>#html5-audio-main-2';
            }
        }
    }

    private isStreamed(item: PlaylistItem): boolean {
        if (item.src.startsWith('apple:')) {
            return true;
        } else {
            switch (item.playbackType) {
                case PlaybackType.DASH:
                case PlaybackType.HLS:
                    return true;

                default:
                    return false;
            }
        }
    }
}

export default new Audio();
