import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import ReplayGainMode from 'types/ReplayGainMode';
import {LiteStorage} from 'utils';

export interface AudioSettings {
    replayGainMode: ReplayGainMode;
    replayGainPreAmp: number;
}

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
};

export default audioSettings;

export function observeAudioSettings(): Observable<Readonly<AudioSettings>> {
    return storage.observeChange().pipe(
        startWith(undefined),
        map(() => ({...audioSettings}))
    );
}
