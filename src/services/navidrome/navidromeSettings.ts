import SubsonicSettings from 'services/subsonic/factory/SubsonicSettings';

export class NavidromeSettings extends SubsonicSettings {
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

    clear(): void {
        super.clear();
        this.storage.removeItem('token');
        this.storage.removeItem('userId');
    }
}

export default new NavidromeSettings('navidrome');
