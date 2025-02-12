import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import {loadScript, Logger} from 'utils';
import youtubeSettings from './youtubeSettings';
import youtubeApi from './youtubeApi';

const logger = new Logger('youtubeAuth');

const scope = 'https://www.googleapis.com/auth/youtube';

const accessToken$ = new BehaviorSubject('');

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!youtubeSettings.token;
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
    return accessToken$.value;
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            const token = await obtainAccessToken();
            setAccessToken(token);
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    try {
        await revokeAccessToken();
    } catch (err) {
        logger.error(err);
    }
    clearAccessToken();
}

export async function reconnect(): Promise<void> {
    try {
        await checkConnection();
        accessToken$.next(youtubeSettings.token);
    } catch (err: any) {
        if (err.status !== 401) {
            logger.error(err);
        }
        youtubeSettings.token = '';
    }
}

export async function refreshToken(): Promise<void> {
    // I don't know how to do this yet (without annoying popups).
    clearAccessToken();
    throw Error('Unauthorized');
}

export function clearAccessToken(): void {
    setAccessToken('');
}

function setAccessToken(token: string): void {
    youtubeSettings.token = token;
    accessToken$.next(token);
}

async function revokeAccessToken(): Promise<void> {
    const token = getAccessToken();
    if (token) {
        const oauth2 = await getGsiClient();
        return new Promise((resolve, reject) => {
            try {
                oauth2.revoke(token, resolve);
            } catch (err) {
                reject(err);
            }
        });
    }
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
            client_id: youtubeSettings.clientId,
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

async function checkConnection(): Promise<any> {
    // The cheapest API call (value of 1).
    return youtubeApi.get({
        path: 'videoCategories',
        params: {regionCode: 'us'},
    });
}
