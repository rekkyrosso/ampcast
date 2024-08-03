import PlaybackState from 'types/PlaybackState';
import {getPlaybackState, observePlaybackState} from 'services/mediaPlayback/playback';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';

export default class OmniAnalyserNode extends AnalyserNode {
    private isPlayingSpotify = false;

    constructor(context: BaseAudioContext, options?: AnalyserOptions) {
        super(context, options);

        const isPlayingSpotify = ({currentItem}: PlaybackState) =>
            !!currentItem?.src.startsWith('spotify:');

        this.isPlayingSpotify = isPlayingSpotify(getPlaybackState());

        observePlaybackState().subscribe((state) => {
            this.isPlayingSpotify = isPlayingSpotify(state);
        });
    }

    getByteFrequencyData(array: Uint8Array): void {
        if (this.isPlayingSpotify) {
            spotifyAudioAnalyser.getByteFrequencyData(array);
        } else {
            super.getByteFrequencyData(array);
        }
    }

    getFloatFrequencyData(array: Float32Array): void {
        if (this.isPlayingSpotify) {
            spotifyAudioAnalyser.getFloatFrequencyData(array);
        } else {
            super.getFloatFrequencyData(array);
        }
    }

    getByteTimeDomainData(array: Uint8Array): void {
        if (this.isPlayingSpotify) {
            spotifyAudioAnalyser.getByteTimeDomainData(array);
        } else {
            super.getByteTimeDomainData(array);
        }
    }

    getFloatTimeDomainData(array: Float32Array): void {
        if (this.isPlayingSpotify) {
            spotifyAudioAnalyser.getFloatTimeDomainData(array);
        } else {
            super.getFloatTimeDomainData(array);
        }
    }
}
