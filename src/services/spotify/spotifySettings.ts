import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {sp_client_id} from 'services/credentials';
import {LiteStorage} from 'utils';

export interface SpotifyCredentials {
    readonly clientId: string;
}

interface TokenStore {
    access_token: string;
    refresh_token: string;
}

const storage = new LiteStorage('spotify');
const authStorage = new LiteStorage('spotify/auth');
const userStorage = new LiteStorage('spotify/user', 'memory');
const credentials$ = new BehaviorSubject<SpotifyCredentials>({clientId: ''});

const spotifySettings = {
    get chartsCategoryId(): string {
        return storage.getString('chartsCategoryId');
    },

    set chartsCategoryId(id: string) {
        storage.setString('chartsCategoryId', id);
    },

    get clientId(): string {
        return sp_client_id || authStorage.getString('clientId');
    },

    set clientId(clientId: string) {
        if (!sp_client_id) {
            authStorage.setString('clientId', clientId);
            credentials$.next({clientId});
        }
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

    observeCredentials(this: unknown): Observable<SpotifyCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): SpotifyCredentials {
        return credentials$.value;
    },

    clear(): void {
        authStorage.removeItem('token');
        storage.removeItem('chartsCategoryId');
        userStorage.clear();
    },
};

credentials$.next({clientId: spotifySettings.clientId});

export default spotifySettings;
