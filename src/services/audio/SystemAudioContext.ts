import AmpcastElectron from 'types/AmpcastElectron';
import {browser, Logger} from 'utils';

export default class SystemAudioContext extends AudioContext {
    #output = this.createGain();

    constructor(electron: AmpcastElectron) {
        super({latencyHint: 'playback'});
        this.createAudio(electron);
    }

    get output(): AudioNode {
        return this.#output;
    }

    setVolume(volume: number): void {
        // Amplify the signal when the volume is lowered.
        this.#output.gain.value = volume ? Math.min(1 + 1 / volume, 21) : 0;
    }

    private async createAudio(electron: AmpcastElectron): Promise<void> {
        try {
            const audio = new Audio();
            const stream = await this.getSystemAudioStream(electron);
            const source = this.createMediaStreamSource(stream);
            source.connect(this.output);
            audio.muted = true;
            audio.autoplay = true;
            audio.srcObject = stream;
        } catch (err) {
            new Logger('SystemAudioContext').error(err);
        }
    }

    private async getSystemAudioStream(electron: AmpcastElectron): Promise<MediaStream> {
        await electron.enableLoopbackAudio();
        const stream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: browser.os === 'Mac OS',
        });
        await electron.disableLoopbackAudio(); // Restore `getDisplayMedia` functionality.
        return stream;
    }
}
