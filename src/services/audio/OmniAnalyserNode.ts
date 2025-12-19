import {fromEvent, takeUntil} from 'rxjs';
import PlaybackState from 'types/PlaybackState';
import {getPlaybackState, observePlaybackState} from 'services/mediaPlayback/playback';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import systemAudioAnalyser from './systemAudioAnalyser';
import {observeAudioSettings} from './audioSettings';

export default class OmniAnalyserNode extends AnalyserNode {
    #isPlayingSpotify = false;
    #useSystemAudio = false;

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

        observeAudioSettings()
            .pipe(takeUntil(killed$))
            .subscribe(({useSystemAudio}) => {
                this.#useSystemAudio = useSystemAudio;
            });
    }

    get isPlayingSpotify(): boolean {
        return this.#isPlayingSpotify;
    }

    getByteFrequencyData(data: Uint8Array<ArrayBuffer>): void {
        if (this.#useSystemAudio) {
            systemAudioAnalyser.getByteFrequencyData(data);
        } else if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getByteFrequencyData(data);
        } else {
            super.getByteFrequencyData(data);
        }
    }

    getByteTimeDomainData(data: Uint8Array<ArrayBuffer>): void {
        if (this.#useSystemAudio) {
            systemAudioAnalyser.getByteTimeDomainData(data);
        } else if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getByteTimeDomainData(data);
        } else {
            super.getByteTimeDomainData(data);
        }
    }

    getFloatFrequencyData(data: Float32Array<ArrayBuffer>): void {
        if (this.#useSystemAudio) {
            systemAudioAnalyser.getFloatFrequencyData(data);
        } else if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getFloatFrequencyData(data);
        } else {
            super.getFloatFrequencyData(data);
        }
    }

    getFloatTimeDomainData(data: Float32Array<ArrayBuffer>): void {
        if (this.#useSystemAudio) {
            systemAudioAnalyser.getFloatTimeDomainData(data);
        } else if (this.#isPlayingSpotify) {
            spotifyAudioAnalyser.getFloatTimeDomainData(data);
        } else {
            super.getFloatTimeDomainData(data);
        }
    }
}
