import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import ampcastElectron from 'services/ampcastElectron';
import {yt_api_key, yt_client_id} from 'services/credentials';
import {LiteStorage} from 'utils';

export interface YouTubeCredentials {
    readonly apiKey: string;
    readonly clientId: string;
}

const storage = new LiteStorage('youtube');
const credentials$ = new BehaviorSubject<YouTubeCredentials>({apiKey: '', clientId: ''});

const youtubeSettings = {
    get clientId(): string {
        return yt_client_id || storage.getString('clientId');
    },

    set clientId(clientId: string) {
        if (!yt_client_id) {
            storage.setString('clientId', clientId);
            credentials$.next({...credentials$.value, clientId});
        }
    },

    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get disabled(): boolean {
        return __youtube_disabled__ && !storage.getBoolean('enabled');
    },

    observeCredentials(this: unknown): Observable<YouTubeCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): YouTubeCredentials {
        return credentials$.value;
    },

    async getApiKey(): Promise<string> {
        if (yt_api_key) {
            return yt_api_key;
        } else if (ampcastElectron) {
            return ampcastElectron.getCredential('youtube/apiKey');
        } else {
            return storage.getString('apiKey');
        }
    },

    async setApiKey(apiKey: string): Promise<void> {
        if (!yt_api_key) {
            if (ampcastElectron) {
                await ampcastElectron.setCredential('youtube/apiKey', apiKey);
            } else {
                storage.setString('apiKey', apiKey);
            }
            credentials$.next({...credentials$.value, apiKey});
        }
    },
};

youtubeSettings
    .getApiKey()
    .then(
        (apiKey) => credentials$.next({apiKey, clientId: youtubeSettings.clientId}),
        console.error
    );

export default youtubeSettings;
