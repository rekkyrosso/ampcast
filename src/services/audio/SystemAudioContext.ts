import {BehaviorSubject, filter, firstValueFrom, map} from 'rxjs';
import AmpcastElectron from 'types/AmpcastElectron';
import {browser, Logger} from 'utils';

export default class SystemAudioContext extends AudioContext {
    #ready$ = new BehaviorSubject(false);
    #audio = new Audio();
    #source: AudioNode | undefined;

    constructor(electron: AmpcastElectron) {
        super({latencyHint: 'playback'});
        this.createAudio(electron);
    }

    get source(): AudioNode | undefined {
        return this.#source;
    }

    async ready(): Promise<void> {
        return firstValueFrom(
            this.#ready$.pipe(
                filter((ready) => ready),
                map(() => undefined)
            )
        );
    }

    private async createAudio(electron: AmpcastElectron): Promise<void> {
        try {
            const stream = await this.getSystemAudioStream(electron);
            this.#source = this.createMediaStreamSource(stream);
            this.#audio.muted = true;
            this.#audio.autoplay = true;
            this.#audio.srcObject = stream;
        } catch (err) {
            new Logger('SystemAudioContext').error(err);
        }
        this.#ready$.next(true);
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
