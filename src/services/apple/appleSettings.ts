import {am_dev_token} from 'services/credentials';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('apple');

export default {
    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get devToken(): string {
        return am_dev_token || storage.getString('devToken');
    },

    set devToken(devToken: string) {
        storage.setString('devToken', devToken);
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
