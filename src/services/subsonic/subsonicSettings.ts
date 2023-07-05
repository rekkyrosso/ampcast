import {LiteStorage} from 'utils';

const storage = new LiteStorage('subsonic');

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

    get folders(): Subsonic.MusicFolder[] {
        return storage.getJson('folders') || [];
    },

    set folders(folders: Subsonic.MusicFolder[]) {
        storage.setJson('folders', folders);
    },

    get userName(): string {
        return storage.getString('userName');
    },

    set userName(userName: string) {
        storage.setString('userName', userName);
    },

    clear(): void {
        storage.removeItem('userName');
        storage.removeItem('credentials');
    },
};
