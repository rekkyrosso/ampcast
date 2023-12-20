import {LiteStorage} from 'utils';

const storage = new LiteStorage('apple');

export default {
    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get favoriteSongsId(): string {
        return storage.getString('favoriteSongsId');
    },

    set favoriteSongsId(id: string) {
        storage.setString('favoriteSongsId', id);
    },

    get useMusicKitBeta(): boolean {
        return storage.getBoolean('useMusicKitBeta', true);
    },

    set useMusicKitBeta(beta: boolean) {
        storage.setBoolean('useMusicKitBeta', beta);
    },
};
