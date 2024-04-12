import {lf_api_key, lf_api_secret} from 'services/credentials';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('lastfm');

export default {
    get apiKey(): string {
        return lf_api_key || storage.getString('apiKey');
    },

    set apiKey(apiKey: string) {
        storage.setString('apiKey', apiKey);
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

    get sessionKey(): string {
        return storage.getString('sessionKey');
    },

    set sessionKey(sessionKey: string) {
        storage.setString('sessionKey', sessionKey);
    },

    get firstScrobbledAt(): string {
        return storage.getString('firstScrobbledAt');
    },

    set firstScrobbledAt(time: string) {
        storage.setString('firstScrobbledAt', time);
    },

    get playCount(): number {
        return storage.getNumber('playCount');
    },

    set playCount(count: number) {
        storage.setNumber('playCount', count);
    },

    get secret(): string {
        return lf_api_secret || storage.getString('secret');
    },

    set secret(secret: string) {
        storage.setString('secret', secret);
    },

    clear(): void {
        storage.clear();
    },
};
