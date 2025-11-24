import {distinctUntilChanged, map, mergeMap} from 'rxjs';
import AmpcastElectron from 'types/AmpcastElectron';
import {Logger} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {observeAudioSettings} from './audioSettings';

const logger = new Logger('systemAudioAnalyser');

class SystemAudioAnalyser {
    private audio: HTMLAudioElement | undefined;
    private analyser: AnalyserNode | undefined;

    constructor() {
        observeAudioSettings()
            .pipe(
                map(({useSystemAudio}) => useSystemAudio),
                distinctUntilChanged(),
                mergeMap(async (useSystemAudio) => {
                    try {
                        if (useSystemAudio) {
                            await this.createAnalyser();
                            await this.audio!.play();
                        } else {
                            this.audio?.pause();
                        }
                    } catch (err) {
                        logger.error(err);
                    }
                })
            )
            .subscribe(logger);
    }

    getByteFrequencyData(data: Uint8Array<ArrayBuffer>): void {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(data);
        } else {
            data.fill(0);
        }
    }

    getByteTimeDomainData(data: Uint8Array<ArrayBuffer>): void {
        if (this.analyser) {
            this.analyser.getByteTimeDomainData(data);
        } else {
            data.fill(0);
        }
    }

    getFloatFrequencyData(data: Float32Array<ArrayBuffer>): void {
        if (this.analyser) {
            this.analyser.getFloatFrequencyData(data);
        } else {
            data.fill(0);
        }
    }

    getFloatTimeDomainData(data: Float32Array<ArrayBuffer>): void {
        if (this.analyser) {
            this.analyser.getFloatTimeDomainData(data);
        } else {
            data.fill(0);
        }
    }

    private async createAnalyser(): Promise<void> {
        if (ampcastElectron && !this.analyser) {
            const stream = await this.getSystemAudioStream(ampcastElectron);
            const context = new AudioContext({latencyHint: 'playback'});
            const source = context.createMediaStreamSource(stream);
            this.analyser = new AnalyserNode(context);
            this.audio = new Audio();
            this.audio.muted = true;
            this.audio.autoplay = false;
            this.audio.srcObject = stream;
            source.connect(this.analyser);
        }
    }

    private async getSystemAudioStream(electron: AmpcastElectron): Promise<MediaStream> {
        // https://github.com/alectrocute/electron-audio-loopback

        // Tell the main process to enable system audio loopback.
        // This will override the default `getDisplayMedia` behavior.
        await electron.enableLoopbackAudio();

        // Get a MediaStream with system audio loopback.
        // `getDisplayMedia` will fail if you don't request `video: true`.
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        // Remove video tracks that we don't need.
        // Note: You may find bugs if you don't remove video tracks.
        stream.getVideoTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
        });

        // Tell the main process to disable system audio loopback.
        // This will restore full `getDisplayMedia` functionality.
        // Do this if you need to use `getDisplayMedia` for other
        // purposes elsewhere in your app.
        await electron.disableLoopbackAudio();

        return stream;
    }
}

export default new SystemAudioAnalyser();
