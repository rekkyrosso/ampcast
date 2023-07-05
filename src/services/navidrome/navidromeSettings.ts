import {LiteStorage} from 'utils';

const storage = new LiteStorage('navidrome');

export default {
    get host(): string {
        return storage.getString('host');
    },

    set host(host: string) {
        storage.setString('host', host);
    },

    get credentials(): string {
        return storage.getString('credentials');
    },

    set credentials(credentials: string) {
        storage.setString('credentials', credentials);
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
        storage.removeItem('token');
        storage.removeItem('credentials');
        storage.removeItem('userId');
    },
};
