import {LiteStorage} from 'utils';

const storage = new LiteStorage('listenbrainz');

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

    get firstScrobbledAt(): string {
        return storage.getString('firstScrobbledAt');
    },

    set firstScrobbledAt(time: string) {
        storage.setString('firstScrobbledAt', time);
    },

    clear(): void {
        storage.clear();
    },
};
