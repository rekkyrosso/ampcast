import {nanoid} from 'nanoid';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('jellyfin');

export default {
    get host(): string {
        return storage.getString('host');
    },

    set host(host: string) {
        storage.setString('host', host);
    },

    get device(): string {
        return 'PC';
    },

    get deviceId(): string {
        let deviceId = storage.getString('deviceId');
        if (!deviceId) {
            deviceId = nanoid();
            storage.setString('deviceId', deviceId);
        }
        return deviceId;
    },

    get token(): string {
        return storage.getString('token');
    },

    set token(token: string) {
        storage.setString('token', token);
    },

    get userId(): string {
        return storage.getString('userId');
    },

    set userId(userId: string) {
        storage.setString('userId', userId);
    },

    clear(): void {
        storage.removeItem('userId');
        storage.removeItem('token');
    },
};
