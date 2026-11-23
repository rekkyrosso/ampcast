import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {LiteStorage, Logger} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {lf_api_key} from 'services/mediaServices/buildConfig';

const logger = new Logger('lastfmSettings');

export interface LastFmCredentials {
    readonly apiKey: string;
    readonly secret: string;
}

const storage = new LiteStorage('lastfm');
const credentials$ = new BehaviorSubject<LastFmCredentials>({apiKey: '', secret: ''});

const lastfmSettings = {
    get apiKey(): string {
        return lf_api_key || storage.getSecret('apiKey');
    },

    set apiKey(apiKey: string) {
        if (!this.credentialsLocked) {
            storage.setSecret('apiKey', apiKey);
            credentials$.next({...credentials$.value, apiKey});
        }
    },

    get credentialsLocked(): boolean {
        return !!lf_api_key;
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
        if (this.credentialsLocked) {
            return '';
        } else if (ampcastElectron) {
            return ampcastElectron.getCredential('lastfm/secret');
        } else {
            return storage.getSecret('secret');
        }
    },

    async setSecret(secret: string): Promise<void> {
        if (!this.credentialsLocked) {
            if (ampcastElectron) {
                await ampcastElectron.setCredential('lastfm/secret', secret);
            } else {
                storage.setSecret('secret', secret);
            }
            credentials$.next({...credentials$.value, secret});
        }
    },

    clear(): void {
        storage.clear();
        // Restore credentials
        if (!lf_api_key) {
            storage.setSecret('apiKey', credentials$.value.apiKey);
        }
        if (!ampcastElectron) {
            storage.setSecret('secret', credentials$.value.secret);
        }
    },
};

lastfmSettings
    .getSecret()
    .then((secret) => credentials$.next({apiKey: lastfmSettings.apiKey, secret}), logger.error);

export default lastfmSettings;
