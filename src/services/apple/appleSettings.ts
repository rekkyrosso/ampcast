import {LiteStorage} from 'utils';

const storage = new LiteStorage('apple');

export default {
    get useMusicKitBeta(): boolean {
        return storage.getItem(`useMusicKitBeta`) === 'true';
    },

    set useMusicKitBeta(beta: boolean) {
        storage.setItem(`useMusicKitBeta`, String(beta));
    },

    clear(): void {
        storage.clear();
    },
};
