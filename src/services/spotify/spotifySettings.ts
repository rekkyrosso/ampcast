import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {LiteStorage} from 'utils';
import {sp_client_id} from 'services/buildConfig';

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
const credentials$ = new BehaviorSubject<SpotifyCredentials>({
    clientId: '',
});

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

    get credentialsLocked(): boolean {
        return !!sp_client_id;
    },

    get market(): string {
        return userStorage.getString('market');
    },

    set market(market: string) {
        userStorage.setString('market', market);
    },

    get redirectUri(): string {
        const authPath = '/auth/spotify/callback/';
        if (location.protocol === 'https:') {
            return `${location.origin}${authPath}`;
        } else {
            return `http://[::1]:${location.port}${authPath}`;
        }
    },

    get restrictedApi(): boolean {
        // https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
        // https://ampcast.app is exempt from these changes.
        return !/^ampcast\.(app|dev)$/.test(location.hostname);
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

credentials$.next({...spotifySettings});

export default spotifySettings;
