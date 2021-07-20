import {nanoid} from 'nanoid';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('jellyfin');

export default {
    get host(): string {
        return storage.getItem(`host`) || ''
    },

    set host(host: string) {
        storage.setItem(`host`, host);
    },

    get device(): string {
        return 'PC';
    },

    get deviceId(): string {
        let deviceId = storage.getItem(`deviceId`);
        if (!deviceId) {
            deviceId = nanoid();
            storage.setItem(`deviceId`, deviceId);
        }
        return deviceId;
    },

    get token(): string {
        return storage.getItem(`token`) || '';
    },

    set token(token: string) {
        storage.setItem(`token`, token);
    },

    get userId(): string {
        return storage.getItem(`userId`) || '';
    },

    set userId(userId: string) {
        storage.setItem(`userId`, userId);
    },
};
