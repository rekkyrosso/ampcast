import {LiteStorage} from 'utils';

const storage = new LiteStorage('lastfm');

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

    get sessionKey(): string {
        return storage.getItem(`sessionKey`) || '';
    },

    set sessionKey(sessionKey: string) {
        storage.setItem(`sessionKey`, sessionKey);
    },

    get removeDuplicates(): boolean {
        return storage.getItem(`removeDuplicates`) === 'true';
    },

    set removeDuplicates(removeDuplicates: boolean) {
        storage.setItem(`removeDuplicates`, String(removeDuplicates));
    },

    clear(): void {
        storage.clear();
    },
};
