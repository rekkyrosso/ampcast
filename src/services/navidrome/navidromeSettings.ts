import {LiteStorage} from 'utils';
import {getServerHost, isStartupService} from 'services/buildConfig';

const storage = new LiteStorage('navidrome');

const navidromeSettings = {
    get connectedAt(): number {
        return storage.getNumber(
            'connectedAt',
            this.token || isStartupService('navidrome') ? 1 : 0
        );
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get credentials(): string {
        return storage.getString('credentials');
    },

    set credentials(credentials: string) {
        storage.setString('credentials', credentials);
    },

    get host(): string {
        return storage.getString('host', getServerHost('navidrome'));
    },

    set host(host: string) {
        storage.setString('host', host);
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

    get userName(): string {
        return storage.getString('userName');
    },

    set userName(userName: string) {
        storage.setString('userName', userName);
    },

    get useManualLogin(): boolean {
        return storage.getBoolean('useManualLogin');
    },

    set useManualLogin(useManualLogin: boolean) {
        storage.setBoolean('useManualLogin', useManualLogin);
    },

    clear(): void {
        storage.removeItem('token');
        storage.removeItem('credentials');
        storage.removeItem('userId');
    },
};

export default navidromeSettings;
