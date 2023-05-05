import SimpleAudioAnalyser from 'types/SimpleAudioAnalyser';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import {SpotifyAudioAnalyser} from 'services/spotify/spotifyAudioAnalyser';

export default class OmniAnalyser implements SimpleAudioAnalyser {
    private currentAnalyser: AnalyserNode | SpotifyAudioAnalyser;

    constructor(
        private readonly analyserNode: AnalyserNode,
        private readonly spotifyAudioAnalyser: SpotifyAudioAnalyser
    ) {
        this.currentAnalyser = analyserNode;

        observePlaybackStart().subscribe(({currentItem}) => {
            if (currentItem!.src.startsWith('spotify:')) {
                this.currentAnalyser = spotifyAudioAnalyser;
            } else {
                this.currentAnalyser = analyserNode;
            }
        });
    }

    get fftSize(): number {
        return this.analyserNode.fftSize;
    }

    set fftSize(fftSize: number) {
        this.analyserNode.fftSize = fftSize;
        this.spotifyAudioAnalyser.fftSize = fftSize;
    }

    get frequencyBinCount(): number {
        return this.analyserNode.frequencyBinCount;
    }

    getByteFrequencyData(array: Uint8Array): void {
        this.currentAnalyser.getByteFrequencyData(array);
    }

    getFloatFrequencyData(array: Float32Array): void {
        this.currentAnalyser.getFloatFrequencyData(array);
    }

    getByteTimeDomainData(array: Uint8Array): void {
        this.currentAnalyser.getByteTimeDomainData(array);
    }
}
