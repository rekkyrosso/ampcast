import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import ampcastElectron from 'services/ampcastElectron';
import {lf_api_key, lf_api_secret} from 'services/credentials';
import {LiteStorage} from 'utils';

export interface LastFmCredentials {
    readonly apiKey: string;
    readonly secret: string;
}

const storage = new LiteStorage('lastfm');
const credentials$ = new BehaviorSubject<LastFmCredentials>({apiKey: '', secret: ''});

const lastfmSettings = {
    get apiKey(): string {
        return lf_api_key || storage.getString('apiKey');
    },

    set apiKey(apiKey: string) {
        if (!lf_api_key) {
            storage.setString('apiKey', apiKey);
            credentials$.next({...credentials$.value, apiKey});
        }
    },

    get credentialsRequired(): boolean {
        return !lf_api_key;
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

    get sessionKey(): string {
        return storage.getString('sessionKey');
    },

    set sessionKey(sessionKey: string) {
        storage.setString('sessionKey', sessionKey);
    },

    get firstScrobbledAt(): string {
        return storage.getString('firstScrobbledAt');
    },

    set firstScrobbledAt(time: string) {
        storage.setString('firstScrobbledAt', time);
    },

    get playCount(): number {
        return storage.getNumber('playCount');
    },

    set playCount(count: number) {
        storage.setNumber('playCount', count);
    },

    observeCredentials(this: unknown): Observable<LastFmCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): LastFmCredentials {
        return credentials$.value;
    },

    async getSecret(): Promise<string> {
        if (lf_api_secret) {
            return lf_api_secret;
        } else if (ampcastElectron) {
            return ampcastElectron.getCredential('lastfm/secret');
        } else {
            return storage.getString('secret');
        }
    },

    async setSecret(secret: string): Promise<void> {
        if (!lf_api_secret) {
            if (ampcastElectron) {
                await ampcastElectron.setCredential('lastfm/secret', secret);
            } else {
                storage.setString('secret', secret);
            }
            credentials$.next({...credentials$.value, secret});
        }
    },

    clear(): void {
        storage.clear();
        // Restore credentials
        if (!lf_api_key) {
            storage.setString('apiKey', credentials$.value.apiKey);
        }
        if (!lf_api_secret && !ampcastElectron) {
            storage.setString('secret', credentials$.value.secret);
        }
    },
};

lastfmSettings
    .getSecret()
    .then((secret) => credentials$.next({apiKey: lastfmSettings.apiKey, secret}), console.error);

export default lastfmSettings;
