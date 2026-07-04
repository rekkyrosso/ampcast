import {fromEvent, takeUntil} from 'rxjs';
import PlaybackState from 'types/PlaybackState';
import type {SpotifyAudioAnalyser} from 'services/spotify/spotifyAudioAnalyser';
import {getPlaybackState, observePlaybackState} from 'services/mediaPlayback/playback';

export default class OmniAnalyserNode extends AnalyserNode {
    static spotifyAudioAnalyser: SpotifyAudioAnalyser | undefined;
    #isPlayingSpotify = false;

    constructor(context: BaseAudioContext, options?: AnalyserOptions) {
        super(context, options);

        const killed$ = fromEvent(window, 'pagehide');

        const isPlayingSpotify = ({currentItem}: PlaybackState) =>
            !!currentItem?.src.startsWith('spotify:');

        this.#isPlayingSpotify = isPlayingSpotify(getPlaybackState());

        observePlaybackState()
            .pipe(takeUntil(killed$))
            .subscribe((state) => {
                this.#isPlayingSpotify = isPlayingSpotify(state);
            });
    }

    getByteFrequencyData(data: Uint8Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            this.spotifyAnalyser?.getByteFrequencyData(data);
        } else {
            super.getByteFrequencyData(data);
        }
    }

    getByteTimeDomainData(data: Uint8Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            this.spotifyAnalyser?.getByteTimeDomainData(data);
        } else {
            super.getByteTimeDomainData(data);
        }
    }

    getFloatFrequencyData(data: Float32Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            this.spotifyAnalyser?.getFloatFrequencyData(data);
        } else {
            super.getFloatFrequencyData(data);
        }
    }

    getFloatTimeDomainData(data: Float32Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            this.spotifyAnalyser?.getFloatTimeDomainData(data);
        } else {
            super.getFloatTimeDomainData(data);
        }
    }

    private get spotifyAnalyser(): SpotifyAudioAnalyser | undefined {
        return OmniAnalyserNode.spotifyAudioAnalyser;
    }
}
