import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import AudioSettings from 'types/AudioSettings';
import ReplayGainMode from 'types/ReplayGainMode';
import {browser, LiteStorage} from 'utils';

const storage = new LiteStorage('audio');

const audioSettings: AudioSettings = {
    get replayGainMode(): ReplayGainMode {
        return storage.getString('replayGainMode');
    },

    set replayGainMode(mode: ReplayGainMode) {
        storage.setString('replayGainMode', mode);
    },

    get replayGainPreAmp(): number {
        return storage.getNumber('replayGainPreAmp', 12);
    },

    set replayGainPreAmp(preAmp: number) {
        storage.setNumber('replayGainPreAmp', preAmp);
    },

    get useSystemAudio(): boolean {
        if (browser.isElectron) {
            return storage.getBoolean('useSystemAudio');
        } else {
            return false;
        }
    },

    set useSystemAudio(useSystemAudio: boolean) {
        storage.setBoolean('useSystemAudio', useSystemAudio);
    },
};

export default audioSettings;

export function observeAudioSettings(): Observable<Readonly<AudioSettings>> {
    return storage.observeChange().pipe(
        startWith(undefined),
        map(() => ({...audioSettings}))
    );
}
