import {LiteStorage} from 'utils';

const storage = new LiteStorage('apple');

export default {
    get useMusicKitBeta(): boolean {
        return storage.getBoolean('useMusicKitBeta');
    },

    set useMusicKitBeta(beta: boolean) {
        storage.setBoolean('useMusicKitBeta', beta);
    },

    clear(): void {
        storage.clear();
    },
};
