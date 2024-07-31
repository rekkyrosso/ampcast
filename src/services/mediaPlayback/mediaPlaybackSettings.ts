import {LiteStorage} from 'utils';

const storage = new LiteStorage('mediaPlayback');
const session = new LiteStorage('mediaPlayback', 'session');

const mediaPlaybackSettings = {
    get muted(): boolean {
        return session.getBoolean('muted');
    },

    set muted(muted: boolean) {
        session.setBoolean('muted', muted);
    },

    get volume(): number {
        return storage.getNumber('volume', 0.7);
    },

    set volume(volume: number) {
        storage.setNumber('volume', volume);
    },
};

export default mediaPlaybackSettings;
