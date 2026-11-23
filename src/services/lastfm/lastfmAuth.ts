import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {nanoid} from 'nanoid';
import {Logger, openLoginPopup} from 'utils';
import {getReadableErrorMessage} from 'services/errors';
import lastfmApi from './lastfmApi';
import lastfmSettings from './lastfmSettings';

const logger = new Logger('lastfmAuth');

const lastfmApiHost = `https://ws.audioscrobbler.com/2.0`;

const isLoggedIn$ = new BehaviorSubject(false);
const sessionKey$ = new BehaviorSubject('');
const connecting$ = new BehaviorSubject(false);
const connectionLogging$ = new Subject<string>();

export function observeConnecting(): Observable<boolean> {
    return connecting$.pipe(distinctUntilChanged());
}

export function observeConnectionLogging(): Observable<string> {
    return connectionLogging$;
}

export function observeSessionKey(): Observable<string> {
    return sessionKey$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!lastfmSettings.sessionKey;
}

export function isLoggedIn(): boolean {
    return isLoggedIn$.value;
}

export function observeIsLoggedIn(): Observable<boolean> {
    return isLoggedIn$.pipe(distinctUntilChanged());
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            connecting$.next(true);
            connectionLogging$.next('');
            const sessionKey = await obtainSessionKey();
            sessionKey$.next(sessionKey);
        } catch (err) {
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        }
        connecting$.next(false);
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    lastfmSettings.clear();
    sessionKey$.next('');
    isLoggedIn$.next(false);
    connecting$.next(false);
}

export async function reconnect(): Promise<void> {
    const sessionKey = lastfmSettings.sessionKey;
    if (sessionKey) {
        connecting$.next(true);
        sessionKey$.next(sessionKey);
    }
}

async function obtainAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        const lastfmApiAuth = `https://www.last.fm/api/auth`;
        const callback = `${location.origin}/auth/lastfm/callback/`;

        let authWindow: Window | null = null;

        const cleanup = () => {
            clearInterval(pollAuthWindowClosed);
            window.removeEventListener('message', receiveMessage, false);
            authWindow?.close();
            authWindow = null;
        };

        const receiveMessage = (event: {
            origin: string;
            data: {token: string; lastfm_callback: boolean};
        }) => {
            if (event.data?.lastfm_callback) {
                cleanup();
                if (event.origin === location.origin) {
                    resolve(event.data.token);
                } else {
                    reject({message: `Origin ${event.origin} does not match ${location.origin}`});
                }
            }
        };

        window.addEventListener('message', receiveMessage, false);

        authWindow = openLoginPopup(
            `${lastfmApiAuth}?state=${nanoid(128)}&cb=${callback}&api_key=${lastfmSettings.apiKey}`,
            'last.fm'
        );

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                cleanup();
                reject({message: 'Cancelled'});
            }
        }, 500);
    });
}

async function obtainSessionKey(): Promise<string> {
    const token = await obtainAccessToken();
    const api_key = lastfmSettings.apiKey;
    const method = 'auth.getSession';
    const params = {api_key, token, method};
    const api_sig = await lastfmApi.getSignature(params);
    const response = await fetch(
        `${lastfmApiHost}?method=${method}&api_key=${api_key}&token=${token}&api_sig=${api_sig}&format=json`
    );
    if (!response.ok) {
        throw response;
    }
    const {session} = await response.json();
    lastfmSettings.userId = session.name;
    lastfmSettings.sessionKey = session.key;
    return session.key;
}

observeSessionKey()
    .pipe(
        filter((key) => !!key),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

async function checkConnection(): Promise<boolean> {
    try {
        await lastfmApi.getUserInfo();
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            lastfmSettings.clear();
            sessionKey$.next('');
            connectionLogging$.next('Not authorized');
        } else {
            logger.error(err);
        }
        return false;
    } finally {
        connecting$.next(false);
    }
}
