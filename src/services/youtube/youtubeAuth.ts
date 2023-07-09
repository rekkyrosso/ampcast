import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    from,
    map,
    mergeMap,
    skipWhile,
    take,
    tap,
} from 'rxjs';
import {yt_api_key, yt_client_id} from 'services/credentials';
import {loadScript, Logger} from 'utils';
import youtubeSettings from './youtubeSettings';

const logger = new Logger('youtubeAuth');

const scope = 'https://www.googleapis.com/auth/youtube.readonly';
const discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];

const accessToken$ = new BehaviorSubject('');

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isLoggedIn(): boolean {
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
        logger.log('connect');
        try {
            const accessToken = await obtainAccessToken();
            accessToken$.next(accessToken);
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    const accessToken = getAccessToken();
    if (accessToken) {
        const oauth2 = await getGsiClient();
        oauth2.revoke(accessToken, () => accessToken$.next(''));
    }
}

async function getGApi(): Promise<typeof gapi> {
    if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js');
    }
    return window.gapi;
}

export async function getGApiClient(): Promise<typeof gapi.client> {
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

export async function getGsiClient(): Promise<typeof google.accounts.oauth2> {
    if (!window.google?.accounts?.oauth2) {
        await loadScript('https://accounts.google.com/gsi/client');
    }
    return google.accounts.oauth2;
}

async function obtainAccessToken(): Promise<string> {
    const oauth2 = google.accounts.oauth2; // let this throw
    return new Promise((resolve, reject) => {
        const tokenClient = oauth2.initTokenClient({
            client_id: yt_client_id,
            scope: scope,
            prompt: '',
            callback: (response) => {
                if (response.error) {
                    reject(response.error_description);
                } else {
                    resolve(response.access_token);
                }
            },
            error_callback: (error) => {
                reject(error.message);
            },
        });
        tokenClient.requestAccessToken();
    });
}

observeIsLoggedIn()
    .pipe(skipWhile((isLoggedIn) => !isLoggedIn))
    .subscribe((isLoggedIn) => (youtubeSettings.connectedAt = isLoggedIn ? Date.now() : 0));

observeIsLoggedIn()
    .pipe(
        filter((isLoggedIn) => isLoggedIn),
        take(1),
        mergeMap(() => Promise.all([getGApi(), getGApiClient()])),
        tap(([gapi, client]) => {
            gapi.load('client:auth2', () => {
                // This will probably stop working soon.
                gapi.auth2.getAuthInstance().isSignedIn.listen((isLoggedIn) => {
                    if (isLoggedIn) {
                        const token = client.getToken();
                        accessToken$.next(token?.access_token || '');
                    } else {
                        accessToken$.next('');
                    }
                });
            });
        })
    )
    .subscribe(logger);

if (youtubeSettings.connectedAt) {
    from(getGApiClient())
        .pipe(
            // This might stop working.
            map((client) => client.getToken()),
            tap((token) => accessToken$.next(token?.access_token || ''))
        )
        .subscribe(logger);
}
