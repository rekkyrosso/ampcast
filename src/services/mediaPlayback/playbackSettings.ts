import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import PlaybackSettings from 'types/PlaybackSettings';
import RepeatMode from 'types/RepeatMode';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('playback');

const playbackSettings: PlaybackSettings = {
    get muted(): boolean {
        return storage.getBoolean('muted');
    },

    set muted(muted: boolean) {
        storage.setBoolean('muted', muted);
    },

    get repeatMode(): RepeatMode {
        return storage.getNumber('repeatMode');
    },

    set repeatMode(repeatMode: RepeatMode) {
        storage.setNumber('repeatMode', repeatMode);
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
