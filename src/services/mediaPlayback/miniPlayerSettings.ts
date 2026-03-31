import {LiteStorage} from 'utils';

const storage = new LiteStorage('miniPlayer');

const miniPlayerSettings = {
    get height(): number {
        return storage.getNumber('height', 450);
    },

    set height(height: number) {
        storage.setNumber('height', height);
    },

    get width(): number {
        return storage.getNumber('width', 600);
    },

    set width(width: number) {
        storage.setNumber('width', width);
    },
};

export default miniPlayerSettings;
