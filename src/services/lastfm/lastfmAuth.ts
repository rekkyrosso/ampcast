import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import md5 from 'md5';
import Auth from 'types/Auth';
import {lf_api_key, lf_api_secret} from 'services/credentials';
import {Logger} from 'utils';
import lastfmSettings from './lastfmSettings';

console.log('module::lastfmAuth');

const lastfmApi = `https://ws.audioscrobbler.com/2.0`;

const logger = new Logger('lastfmAuth');

const accessToken$ = new BehaviorSubject('');
const sessionKey$ = new BehaviorSubject('');

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function observeSessionKey(): Observable<string> {
    return sessionKey$.pipe(distinctUntilChanged());
}

export function isLoggedIn(): boolean {
    return accessToken$.getValue() !== '';
}

export function observeIsLoggedIn(): Observable<boolean> {
    return observeAccessToken().pipe(
        map((token) => token !== ''),
        distinctUntilChanged()
    );
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        try {
            const token = await obtainAccessToken();
            const sessionKey = await obtainSessionKey(token);
            logger.log('Access token successfully obtained.');
            sessionKey$.next(sessionKey);
            accessToken$.next(token);
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    lastfmSettings.clear();
    sessionKey$.next('');
    accessToken$.next('');
}

async function obtainAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const host = location.hostname;
        const base = host === 'localhost' ? `http://${host}:${location.port}` : `https://${host}`;
        const lastfmApiAuth = `https://www.last.fm/api/auth`;
        const callback = `${base}/auth/lastfm/callback/`;

        let authWindow: Window | null = null;

        const receiveMessage = (event: {origin: string; data: {token: string}}) => {
            if (/(localhost|ampcast)/.test(event.origin)) {
                clearInterval(pollAuthWindowClosed);
                window.removeEventListener('message', receiveMessage, false);
                authWindow?.close();
                authWindow = null;

                if (event.origin !== location.origin) {
                    reject({message: `Origin ${event.origin} does not match ${location.origin}`});
                    return;
                }

                resolve(event.data.token);
            }
        };

        window.addEventListener('message', receiveMessage, false);

        authWindow = window.open(
            `${lastfmApiAuth}?api_key=${lf_api_key}&cb=${callback}`,
            'last.fm',
            'popup'
        );

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(pollAuthWindowClosed);
                reject({message: 'access_denied'});
            }
        }, 500);
    });
}

async function obtainSessionKey(token: string): Promise<string> {
    const method = 'auth.getSession';
    const params = {api_key: lf_api_key, token, method};
    const api_sig = getApiSignature(params);
    const response = await fetch(
        `${lastfmApi}?method=${method}&api_key=${lf_api_key}&token=${token}&api_sig=${api_sig}&format=json`
    );
    if (!response.ok) {
        throw response;
    }
    const {session} = await response.json();
    lastfmSettings.userId = session.name;
    lastfmSettings.token = token;
    lastfmSettings.sessionKey = session.key;
    return session.key;
}

export function getApiSignature(params: Record<string, string>): string {
    const keys = Object.keys(params);
    let string = '';

    keys.sort();
    keys.forEach((key) => (string += key + params[key]));

    string += lf_api_secret;

    return md5(string);
}

const lastfmAuth: Auth = {
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

sessionKey$.next(lastfmSettings.sessionKey);
accessToken$.next(lastfmSettings.token);

export default lastfmAuth;
