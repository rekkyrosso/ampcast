import {observePlaybackStart} from 'services/mediaPlayback/playback';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';

export default class OmniAnalyserNode extends AnalyserNode {
    private isPlayingSpotify = false;

    constructor(context: BaseAudioContext, options?: AnalyserOptions) {
        super(context, options);

        observePlaybackStart().subscribe(({currentItem}) => {
            this.isPlayingSpotify = !!currentItem?.src.startsWith('spotify:');
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
