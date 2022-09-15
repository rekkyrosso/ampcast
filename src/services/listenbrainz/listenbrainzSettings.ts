import {LiteStorage} from 'utils';

const storage = new LiteStorage('listenbrainz');

export default {
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

    clear(): void {
        storage.clear();
    },
};
