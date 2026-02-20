import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import PlaybackSettings from 'types/PlaybackSettings';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('playback');

const playbackSettings: PlaybackSettings = {
    get loop(): boolean {
        return storage.getBoolean('loop');
    },

    set loop(loop: boolean) {
        storage.setBoolean('loop', loop);
    },

    get muted(): boolean {
        return storage.getBoolean('muted');
    },

    set muted(muted: boolean) {
        storage.setBoolean('muted', muted);
    },

    get volume(): number {
        return storage.getNumber('volume', 0.7);
    },

    set volume(volume: number) {
        storage.setNumber('volume', volume);
    },
};

export default playbackSettings;

export function observePlaybackSettings(): Observable<Readonly<PlaybackSettings>> {
    return storage.observeChange().pipe(
        startWith(undefined),
        map(() => ({...playbackSettings}))
    );
}
