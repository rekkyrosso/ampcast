import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {LiteStorage} from 'utils';
import {ib_client_id} from 'services/mediaServices/buildConfig';

export interface IBroadcastCredentials {
    readonly clientId: string;
}

interface TokenStore {
    access_token: string;
    refresh_token: string;
}

const authStorage = new LiteStorage('ibroadcast/auth');
const userStorage = new LiteStorage('ibroadcast/user', 'memory');
const credentials$ = new BehaviorSubject<IBroadcastCredentials>({clientId: ''});

const ibroadcastSettings = {
    get bitRate(): string {
        return userStorage.getString('bitRate', '128');
    },

    set bitRate(bitRate: string) {
        userStorage.setString('bitRate', bitRate || '128');
    },

    get clientId(): string {
        return ib_client_id || authStorage.getString('clientId');
    },

    set clientId(clientId: string) {
        if (!ib_client_id) {
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
        return !!ib_client_id;
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

    observeCredentials(this: unknown): Observable<IBroadcastCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): IBroadcastCredentials {
        return credentials$.value;
    },

    clear(): void {
        authStorage.removeItem('token');
        userStorage.clear();
    },
};

credentials$.next({...ibroadcastSettings});

export default ibroadcastSettings;
