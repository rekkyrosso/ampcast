import {LiteStorage} from 'utils';

const storage = new LiteStorage('lastfm');

export default {
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

    get removeDuplicates(): boolean {
        return storage.getBoolean('removeDuplicates');
    },

    set removeDuplicates(removeDuplicates: boolean) {
        storage.setBoolean('removeDuplicates', removeDuplicates);
    },

    clear(): void {
        storage.clear();
    },
};
