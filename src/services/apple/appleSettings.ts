import {LiteStorage} from 'utils';

const storage = new LiteStorage('apple');

export default {
    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

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
