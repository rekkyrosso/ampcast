import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {LiteStorage} from 'utils';
import {sp_client_id} from 'services/buildConfig';
import SpotifyRedirectType from './SpotifyRedirectType';
import {isSafeOrigin} from './spotifyApi';

export interface SpotifyCredentials {
    readonly clientId: string;
    readonly redirectType: SpotifyRedirectType;
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
    redirectType: SpotifyRedirectType.Origin,
});

// TODO: Remove this eventually.
// It supports old Spotify apps that were registered with a localhost callback.
// Added version 0.9.15.
if (authStorage.getItem('redirectType') === null) {
    authStorage.setNumber(
        'redirectType',
        isSafeOrigin() || authStorage.getItem('clientId')
            ? SpotifyRedirectType.Origin
            : SpotifyRedirectType.LocalhostIp6
    );
}

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
            credentials$.next({clientId, redirectType: this.redirectType});
        }
    },

    get codeVerifier(): string {
        return authStorage.getString('code_verifier');
    },

    set codeVerifier(code_verifier: string) {
        authStorage.setString('code_verifier', code_verifier);
    },

    get credentialsRequired(): boolean {
        return !sp_client_id;
    },

    get market(): string {
        return userStorage.getString('market');
    },

    set market(market: string) {
        userStorage.setString('market', market);
    },

    // Temporary setting. To enable migration away from localhost callbacks.
    // https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify
    get redirectType(): SpotifyRedirectType {
        if (isSafeOrigin()) {
            return SpotifyRedirectType.Origin;
        } else {
            return authStorage.getNumber('redirectType', SpotifyRedirectType.LocalhostIp6);
        }
    },

    set redirectType(redirectType: SpotifyRedirectType) {
        authStorage.setNumber('redirectType', redirectType);
        credentials$.next({clientId: this.clientId, redirectType});
    },

    get redirectUri(): string {
        const authPath = '/auth/spotify/callback/';
        switch (this.redirectType) {
            case SpotifyRedirectType.Origin:
                return `${location.origin}${authPath}`;

            case SpotifyRedirectType.LocalhostIp6:
                return `http://[::1]:${location.port}${authPath}`;
        }
    },

    set redirectUri(redirectUri: string) {
        userStorage.setString('redirectUri', redirectUri);
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
