import PlaybackState from 'types/PlaybackState';
import {getPlaybackState, observePlaybackState} from 'services/mediaPlayback/playback';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';

export default class OmniAnalyserNode extends AnalyserNode {
    #isPlayingSpotify = false;

    constructor(context: BaseAudioContext, options?: AnalyserOptions) {
        super(context, options);

        const isPlayingSpotify = ({currentItem}: PlaybackState) =>
            !!currentItem?.src.startsWith('spotify:');

        this.#isPlayingSpotify = isPlayingSpotify(getPlaybackState());

        observePlaybackState().subscribe((state) => {
            this.#isPlayingSpotify = isPlayingSpotify(state);
        });
    }

    get isPlayingSpotify(): boolean {
        return this.#isPlayingSpotify;
    }

    getByteFrequencyData(data: Uint8Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getByteFrequencyData(data);
        } else {
            super.getByteFrequencyData(data);
        }
    }

    getByteTimeDomainData(data: Uint8Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getByteTimeDomainData(data);
        } else {
            super.getByteTimeDomainData(data);
        }
    }

    getFloatFrequencyData(data: Float32Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getFloatFrequencyData(data);
        } else {
            super.getFloatFrequencyData(data);
        }
    }

    getFloatTimeDomainData(data: Float32Array<ArrayBuffer>): void {
        if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getFloatTimeDomainData(data);
        } else {
            super.getFloatTimeDomainData(data);
        }
    }
}
