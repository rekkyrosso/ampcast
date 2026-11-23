import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {browser, LiteStorage, Logger} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {sc_client_id} from 'services/mediaServices/buildConfig';

const logger = new Logger('soundcloudSettings');

export interface SoundCloudCredentials {
    readonly clientId: string;
    readonly secret: string;
}

const authStorage = new LiteStorage('soundcloud/auth');
const userStorage = new LiteStorage('soundcloud/user', 'memory');
const credentials$ = new BehaviorSubject<SoundCloudCredentials>({clientId: '', secret: ''});

const soundcloudSettings = {
    get authHost(): string {
        return this.credentialsLocked
            ? `${location.origin}/soundcloud`
            : 'https://secure.soundcloud.com';
    },

    get clientId(): string {
        return sc_client_id || authStorage.getString('clientId');
    },

    set clientId(clientId: string) {
        if (!this.credentialsLocked) {
            authStorage.setString('clientId', clientId);
            credentials$.next({...credentials$.value, clientId});
        }
    },

    get codeVerifier(): string {
        return authStorage.getString('code_verifier');
    },

    set codeVerifier(code_verifier: string) {
        authStorage.setString('code_verifier', code_verifier);
    },

    get credentialsLocked(): boolean {
        return !!sc_client_id;
    },

    get redirectUri(): string {
        const authCallback = 'auth/soundcloud/callback/';
        if (browser.isAmpcastApp || browser.isElectron) {
            return `https://ampcast.dev/${authCallback}`;
        } else {
            return `${location.origin}/${authCallback}`;
        }
    },

    get token(): SoundCloud.Token | null {
        return authStorage.getJson('token');
    },

    set token(token: SoundCloud.Token | null) {
        authStorage.setJson('token', token);
    },

    get userId(): number {
        return userStorage.getNumber('userId');
    },

    set userId(userId: number) {
        userStorage.setNumber('userId', userId);
    },

    observeCredentials(this: unknown): Observable<SoundCloudCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): SoundCloudCredentials {
        return credentials$.value;
    },

    async getSecret(): Promise<string> {
        if (this.credentialsLocked) {
            return '';
        } else if (ampcastElectron) {
            return ampcastElectron.getCredential('soundcloud/secret');
        } else {
            return authStorage.getSecret('secret');
        }
    },

    async setSecret(secret: string): Promise<void> {
        if (!this.credentialsLocked) {
            if (ampcastElectron) {
                await ampcastElectron.setCredential('soundcloud/secret', secret);
            } else {
                authStorage.setSecret('secret', secret);
            }
            credentials$.next({...credentials$.value, secret});
        }
    },

    clear(): void {
        authStorage.removeItem('token');
        userStorage.clear();
    },
};

soundcloudSettings
    .getSecret()
    .then(
        (secret) => credentials$.next({clientId: soundcloudSettings.clientId, secret}),
        logger.error
    );

export default soundcloudSettings;
