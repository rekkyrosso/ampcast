import ampcastElectron from 'services/ampcastElectron';
import SubsonicSettings from 'services/subsonic/factory/SubsonicSettings';

export class NavidromeSettings extends SubsonicSettings {
    get serverVersion(): string {
        return this.storage.getString('serverVersion', '0.0.0');
    }

    set serverVersion(version: string) {
        this.storage.setString('serverVersion', version);
    }

    get token(): string {
        return this.storage.getString('token');
    }

    set token(token: string) {
        this.storage.setString('token', token);
    }

    get userId(): string {
        return this.storage.getString('userId');
    }

    set userId(userId: string) {
        this.storage.setString('userId', userId);
    }

    async getPassword(): Promise<string> {
        if (ampcastElectron) {
            return ampcastElectron.getCredential('navidrome/password');
        } else {
            return '';
        }
    }

    async savePassword(password: string): Promise<void> {
        if (ampcastElectron) {
            await ampcastElectron.setCredential('navidrome/password', password);
        }
    }

    clear(): void {
        super.clear();
        this.storage.removeItem('token');
        this.storage.removeItem('userId');
    }
}

export default new NavidromeSettings('navidrome');
