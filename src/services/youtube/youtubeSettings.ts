import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {yt_client_id} from 'services/credentials';
import {LiteStorage} from 'utils';

export interface YouTubeCredentials {
    readonly clientId: string;
}

const storage = new LiteStorage('youtube');
const credentials$ = new BehaviorSubject<YouTubeCredentials>({clientId: ''});

const youtubeSettings = {
    get clientId(): string {
        return yt_client_id || storage.getString('clientId');
    },

    set clientId(clientId: string) {
        if (!yt_client_id) {
            storage.setString('clientId', clientId);
            credentials$.next({clientId});
        }
    },

    get credentialsRequired(): boolean {
        return !yt_client_id;
    },

    get disabled(): boolean {
        return __youtube_disabled__ && !storage.getBoolean('enabled');
    },

    get token(): string {
        return storage.getString('token');
    },

    set token(token: string) {
        storage.setString('token', token);
    },

    observeCredentials(this: unknown): Observable<YouTubeCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): YouTubeCredentials {
        return credentials$.value;
    },
};

credentials$.next({clientId: youtubeSettings.clientId});

export default youtubeSettings;
