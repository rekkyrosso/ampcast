import {sp_client_id} from 'services/credentials';
import {LiteStorage} from 'utils';

interface TokenStore {
    access_token: string;
    refresh_token: string;
}

const storage = new LiteStorage('spotify');
const authStorage = new LiteStorage('spotify/auth');
const userStorage = new LiteStorage('spotify/user', 'memory');

const spotifySettings = {
    get clientId(): string {
        return sp_client_id || authStorage.getString('clientId');
    },

    set clientId(clientId: string) {
        authStorage.setString('clientId', clientId);
    },

    get codeVerifier(): string {
        return authStorage.getString('code_verifier');
    },

    set codeVerifier(code_verifier: string) {
        authStorage.setString('code_verifier', code_verifier);
    },

    get disabled(): boolean {
        return __spotify_disabled__ && !storage.getBoolean('enabled');
    },

    get market(): string {
        return userStorage.getString('market');
    },

    set market(market: string) {
        userStorage.setString('market', market);
    },

    get token(): TokenStore | null {
        return authStorage.getJson('token');
    },

    set token(token: TokenStore | null) {
        authStorage.setJson('token', token);
    },

    get userId(): string {
        return userStorage.getString('userId');
    },

    set userId(userId: string) {
        userStorage.setString('userId', userId);
    },

    clear(): void {
        authStorage.removeItem('token');
        userStorage.clear();
    },
};

export default spotifySettings;
