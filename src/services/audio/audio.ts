import {distinctUntilChanged, filter, map, pairwise, startWith, tap} from 'rxjs';
import AudioManager from 'types/AudioManager';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import {observePlaybackState} from 'services/mediaPlayback/playback';
import mediaPlaybackSettings from 'services/mediaPlayback/mediaPlaybackSettings';
import {Logger, browser, exists} from 'utils';
import OmniAudioContext from './OmniAudioContext';

const logger = new Logger('audio');

class Audio implements AudioManager {
    #sourceNodes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
    #context = new OmniAudioContext();
    #input = this.#context.createDelay();
    #output = this.#context.createGain();

    // Safari doesn't currently support web audio for streamed media.
    // https://developer.apple.com/forums/thread/56362
    readonly streamingSupported = browser.name !== 'safari';

    constructor() {
        this.#output.gain.value = mediaPlaybackSettings.volume;
        this.#input.connect(this.#output);
        this.#output.connect(this.#context.destination);

        // Map the current <audio> element to a source node that can be used by analysers.
        observePlaybackState()
            .pipe(
                map((state) => state.currentItem),
                filter(exists),
                map((item) => this.getSourceNode(item)),
                startWith(undefined),
                distinctUntilChanged(),
                pairwise(),
                tap(([prevSourceNode, nextSourceNode]) => {
                    prevSourceNode?.disconnect(this.#input!);
                    nextSourceNode?.connect(this.#input!);
                })
            )
            .subscribe(logger);
    }

    get context(): AudioContext {
        return this.#context;
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

    private getSourceNode(item: PlaylistItem): MediaElementAudioSourceNode | undefined {
        const audio = this.getAudioElement(item);
        if (audio) {
            if (!this.#sourceNodes.has(audio)) {
                const sourceNode = this.context!.createMediaElementSource(audio);
                this.#sourceNodes.set(audio, sourceNode);
            }
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
                    return '#ampcast-audio-dash';

                case PlaybackType.HLS:
                    return '#ampcast-audio-hls';

                default:
                    return '#ampcast-audio-main';
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
