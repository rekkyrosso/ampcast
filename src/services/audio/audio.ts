import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    map,
    pairwise,
    switchMap,
    take,
    tap,
} from 'rxjs';
import {SetOptional} from 'type-fest';
import AudioManager from 'types/AudioManager';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import {observePlaybackReady, observePlaybackStart} from 'services/mediaPlayback/playback';
import {Logger, browser, exists} from 'utils';
import OmniAudioContext from './OmniAudioContext';

const logger = new Logger('audio');

class Audio implements SetOptional<AudioManager, 'context' | 'source'> {
    private readonly ready$ = new BehaviorSubject(false);
    private readonly sourceNodes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
    private readonly sourceNode$ = new BehaviorSubject<MediaElementAudioSourceNode | undefined>(
        undefined
    );
    #context?: AudioContext;
    #input?: DelayNode;
    #output?: GainNode;
    #volume = 1;

    // Safari doesn't currently support web audio for streamed media.
    // https://developer.apple.com/forums/thread/56362
    readonly streamingSupported = browser.name !== 'safari';

    constructor() {
        // Wait until the user has initiated media playback.
        observePlaybackReady()
            .pipe(
                tap(() => {
                    // Create audio nodes.
                    const context = new OmniAudioContext();
                    this.#context = context;
                    this.#input = context.createDelay();
                    this.#output = context.createGain();
                    this.#output.gain.value = this.#volume;
                    this.#input.connect(this.#output);
                    this.#output.connect(context.destination);
                    this.ready$.next(true);
                })
            )
            .subscribe(logger);

        // Map the current <audio> element to a source node that can be used by analysers.
        observePlaybackStart()
            .pipe(
                map((state) => state.currentItem),
                filter(exists),
                map((item) => this.getSourceNode(item))
            )
            .subscribe(this.sourceNode$);

        // Start watching the current source when we have a context.
        this.observeReady()
            .pipe(
                switchMap(() => this.sourceNode$),
                distinctUntilChanged(),
                pairwise(),
                tap(([prevSourceNode, nextSourceNode]) => {
                    prevSourceNode?.disconnect(this.#input!);
                    nextSourceNode?.connect(this.#input!);
                })
            )
            .subscribe(logger);
    }

    get context(): AudioContext | undefined {
        return this.#context;
    }

    get source(): AudioNode | undefined {
        return this.#input;
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        this.#volume = volume;
        if (this.#output) {
            this.#output.gain.value = volume;
        }
    }

    observeReady(): Observable<AudioManager> {
        return this.ready$.pipe(
            filter((ready) => ready),
            take(1),
            map(() => this as AudioManager)
        );
    }

    private getSourceNode(item: PlaylistItem): MediaElementAudioSourceNode | undefined {
        const audio = this.getAudioElement(item);
        if (audio) {
            if (!this.sourceNodes.has(audio)) {
                const sourceNode = this.context!.createMediaElementSource(audio);
                this.sourceNodes.set(audio, sourceNode);
            }
            return this.sourceNodes.get(audio);
        }
    }

    private getAudioElement(item: PlaylistItem): HTMLAudioElement | null {
        if (this.canUseWebAudio(item)) {
            const id = this.getAudioElementId(item);
            return document.querySelector<HTMLAudioElement>(`audio#${id}`);
        } else {
            return null;
        }
    }

    private canUseWebAudio(item: PlaylistItem): boolean {
        return (
            item.mediaType === MediaType.Audio &&
            item.playbackType !== PlaybackType.IFrame &&
            (this.streamingSupported || !this.isStreamed(item))
        );
    }

    private getAudioElementId(item: PlaylistItem): string {
        if (item.src.startsWith('apple:')) {
            return 'apple-music-player';
        } else {
            switch (item.playbackType) {
                case PlaybackType.DASH:
                    return 'ampcast-audio-dash';

                case PlaybackType.HLS:
                    return 'ampcast-audio-hls';

                default:
                    return 'ampcast-audio-main';
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
