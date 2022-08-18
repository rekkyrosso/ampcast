import {nanoid} from 'nanoid';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('plex');

export default {
    get clientId(): string {
        let clientId = storage.getItem(`clientId`);
        if (!clientId) {
            clientId = nanoid();
            storage.setItem(`clientId`, clientId);
        }
        return clientId;
    },

    get connection(): plex.Connection | null {
        const json = storage.getItem(`connection`);
        if (json) {
            return JSON.parse(json);
        }
        return null;
    },

    set connection(connection: plex.Connection | null) {
        storage.setItem(`connection`, JSON.stringify(connection));
    },

    get host(): string {
        return this.connection?.uri || '';
    },

    get libraryId(): string {
        return storage.getItem(`libraryId`) || '';
    },

    set libraryId(libraryId: string) {
        storage.setItem(`libraryId`, libraryId);
    },

    get server(): plex.Device | null {
        const json = storage.getItem(`server`);
        if (json) {
            return JSON.parse(json);
        }
        return null;
    },

    set server(server: plex.Device | null) {
        storage.setItem(`server`, JSON.stringify(server));
    },

    get serverToken(): string {
        return this.server?.accessToken || '';
    },

    get userToken(): string {
        return storage.getItem(`userToken`) || '';
    },

    set userToken(token: string) {
        storage.setItem(`userToken`, token);
    },

    get userId(): string {
        return storage.getItem(`userId`) || '';
    },

    set userId(userId: string) {
        storage.setItem(`userId`, userId);
    },

    clear(): void {
        const clientId = this.clientId;
        storage.clear();
        if (clientId) {
            storage.setItem(`clientId`, clientId);
        }
    },
};
