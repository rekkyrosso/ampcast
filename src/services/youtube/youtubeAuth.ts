import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import Auth from 'types/Auth';
import {yt_api_key, yt_client_id} from 'services/credentials';
import {loadScript, Logger} from 'utils';

console.log('module::youtubeAuth');

const logger = new Logger('youtubeAuth');

const scope = 'https://www.googleapis.com/auth/youtube.readonly';
const discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];

const accessToken$ = new BehaviorSubject('');

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

function isLoggedIn(): boolean {
    return getAccessToken() !== '';
}

export function observeIsLoggedIn(): Observable<boolean> {
    return observeAccessToken().pipe(
        map((token) => token !== ''),
        distinctUntilChanged()
    );
}

function getAccessToken(): string {
    return accessToken$.getValue();
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        try {
            const accessToken = await obtainAccessToken();
            accessToken$.next(accessToken);
            logger.log('Access token successfully obtained.');
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    const accessToken = getAccessToken();
    if (accessToken) {
        const oauth2 = await getGsiClient();
        oauth2.revoke(accessToken, () => accessToken$.next(''));
    }
}

const youtubeAuth: Auth = {
    observeIsLoggedIn,
    login,
    logout,
};

export default youtubeAuth;

async function getGApi(): Promise<typeof gapi> {
    if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js');
    }
    return window.gapi;
}

async function getGApiClient(): Promise<typeof gapi.client> {
    const gapi = await getGApi();
    if (gapi.client) {
        return gapi.client;
    }
    return new Promise((resolve, reject) => {
        gapi.load('client', {
            callback: () => {
                const config = {apiKey: yt_api_key, clientId: yt_client_id, discoveryDocs, scope};
                gapi.client.init(config).then(() => resolve(gapi.client), reject);
            },
            onerror: reject,
        });
    });
}

async function getGsiClient(): Promise<typeof google.accounts.oauth2> {
    if (!window.google?.accounts?.oauth2) {
        await loadScript('https://accounts.google.com/gsi/client');
    }
    return google.accounts.oauth2;
}

async function obtainAccessToken(): Promise<string> {
    const oauth2 = await getGsiClient();
    return new Promise((resolve, reject) => {
        const tokenClient = oauth2.initTokenClient({
            client_id: yt_client_id,
            scope: scope,
            callback: (response) => {
                if (response.error) {
                    reject(response.error_description);
                } else {
                    accessToken$.next(response.access_token);
                    resolve(response.access_token);
                }
            },
        });
        tokenClient.requestAccessToken();
    });
}

(async function (): Promise<void> {
    const client = await getGApiClient();
    const token = client.getToken();
    if (token) {
        logger.log('Access token successfully obtained.');
        accessToken$.next(token.access_token);
    }

    // This might stop working.
    gapi.load('client:auth2', () => {
        gapi.auth2.getAuthInstance().isSignedIn.listen((isLoggedIn) => {
            if (isLoggedIn) {
                const token = gapi.client.getToken();
                accessToken$.next(token?.access_token || '');
            } else {
                accessToken$.next('');
            }
        });
    });
})();
