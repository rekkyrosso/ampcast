import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, map, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import lastfmApi from './lastfmApi';
import lastfmSettings from './lastfmSettings';

const logger = new Logger('lastfmAuth');

const lastfmApiHost = `https://ws.audioscrobbler.com/2.0`;

const accessToken$ = new BehaviorSubject('');
const sessionKey$ = new BehaviorSubject('');

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function observeSessionKey(): Observable<string> {
    return sessionKey$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!lastfmSettings.token;
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
        logger.log('connect');
        try {
            const token = await obtainAccessToken();
            const sessionKey = await obtainSessionKey(token);
            sessionKey$.next(sessionKey);
            accessToken$.next(token);
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    lastfmSettings.clear();
    sessionKey$.next('');
    accessToken$.next('');
}

async function obtainAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const lastfmApiAuth = `https://www.last.fm/api/auth`;
        const callback = `${location.origin}/auth/lastfm/callback/`;

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
            `${lastfmApiAuth}?api_key=${lastfmSettings.apiKey}&cb=${callback}`,
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
    const api_key = lastfmSettings.apiKey;
    const method = 'auth.getSession';
    const params = {api_key, token, method};
    const api_sig = lastfmApi.getSignature(params);
    const response = await fetch(
        `${lastfmApiHost}?method=${method}&api_key=${api_key}&token=${token}&api_sig=${api_sig}&format=json`
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

observeAccessToken()
    .pipe(
        filter((token) => !!token),
        mergeMap(() => checkConnection())
    )
    .subscribe(logger);

async function checkConnection(): Promise<void> {
    try {
        await lastfmApi.getUserInfo();
    } catch (err: any) {
        if (err.status === 401) {
            lastfmSettings.clear();
            sessionKey$.next('');
            accessToken$.next('');
        } else {
            logger.error(err);
        }
    }
}

sessionKey$.next(lastfmSettings.sessionKey);
accessToken$.next(lastfmSettings.token);
