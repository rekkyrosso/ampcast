import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, map} from 'rxjs';
import {nanoid} from 'nanoid';
import {Logger, browser, openLoginPopup} from 'utils';
import {getReadableErrorMessage} from 'services/errors';
import soundcloudApi from './soundcloudApi';
import soundcloudSettings from './soundcloudSettings';

const logger = new Logger('soundcloudAuth');

let code_challenge: string;
let refreshTokenTimerId = 0;

const accessToken$ = new BehaviorSubject('');
const connecting$ = new BehaviorSubject(false);
const connectionLogging$ = new Subject<string>();

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function observeConnecting(): Observable<boolean> {
    return connecting$.pipe(distinctUntilChanged());
}

export function observeConnectionLogging(): Observable<string> {
    return connectionLogging$;
}

export function isConnected(): boolean {
    return !!soundcloudSettings.token;
}

export function isLoggedIn(): boolean {
    return accessToken$.value !== '';
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
            connecting$.next(true);
            connectionLogging$.next('');
            const token = await obtainAccessToken();
            await storeAccessToken(token);
        } catch (err) {
            await clearAccessToken();
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        }
        connecting$.next(false);
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    try {
        await revokeAccessToken();
    } catch (err) {
        logger.error(err);
    }
    soundcloudSettings.clear();
    connecting$.next(false);
    await clearAccessToken();
}

export async function reconnect(): Promise<void> {
    try {
        if (soundcloudSettings.token) {
            connecting$.next(true);
            await refreshToken();
            return;
        }
    } catch (err) {
        logger.error(err);
        connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
    } finally {
        connecting$.next(false);
    }
    await clearAccessToken();
}

async function obtainAccessToken(): Promise<SoundCloud.Token> {
    return new Promise((resolve, reject) => {
        const state = new URLSearchParams({
            s: nanoid(),
            o: browser.isElectron ? 'ampcast:/' : location.origin,
        }).toString();

        let authWindow: Window | null = null;

        const cleanup = () => {
            clearInterval(pollAuthWindowClosed);
            window.removeEventListener('message', receiveMessage, false);
            authWindow?.close();
            authWindow = null;
        };

        const receiveMessage = (event: {
            origin: string;
            data: {code: string; state: string; soundcloud_callback: boolean};
        }) => {
            if (event.data?.soundcloud_callback) {
                cleanup();
                if (event.origin !== location.origin) {
                    reject({message: `Origin ${event.origin} does not match ${location.origin}`});
                } else if (event.data.state !== state) {
                    reject({message: 'State mismatch'});
                } else {
                    exchangeToken(event.data.code).then(resolve, reject);
                }
            }
        };

        window.addEventListener('message', receiveMessage, false);

        const params = new URLSearchParams({
            client_id: soundcloudSettings.clientId,
            redirect_uri: soundcloudSettings.redirectUri,
            response_type: 'code',
            code_challenge_method: 'S256',
            code_challenge,
            state,
        });

        authWindow = openLoginPopup(
            `https://secure.soundcloud.com/authorize?${params}`,
            'SoundCloud'
        );

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                cleanup();
                reject({message: 'Cancelled'});
            }
        }, 500);
    });
}

function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function exchangeToken(token: string): Promise<SoundCloud.Token> {
    const secret = await soundcloudSettings.getSecret();
    const response = await fetch(`${soundcloudSettings.authHost}/oauth/token`, {
        method: 'POST',
        headers: {
            Accept: 'application/json; charset=utf-8',
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: new URLSearchParams({
            client_id: soundcloudSettings.clientId,
            client_secret: secret,
            grant_type: 'authorization_code',
            code: token,
            redirect_uri: soundcloudSettings.redirectUri,
            code_verifier: soundcloudSettings.codeVerifier,
        }),
    });

    if (!response.ok) {
        throw response;
    }

    const tokenResponse = await response.json();
    return tokenResponse;
}

export async function refreshToken(): Promise<string> {
    logger.log('refreshToken');
    const token = soundcloudSettings.token;
    const refresh_token = token?.refresh_token;
    if (refresh_token) {
        const secret = await soundcloudSettings.getSecret();
        const response = await fetch(`${soundcloudSettings.authHost}/oauth/token`, {
            method: 'POST',
            headers: {
                Accept: 'application/json; charset=utf-8',
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: new URLSearchParams({
                client_id: soundcloudSettings.clientId,
                client_secret: secret,
                grant_type: 'refresh_token',
                refresh_token,
            }),
        });
        if (!response.ok) {
            await clearAccessToken();
            throw response;
        }
        const token = await response.json();
        await storeAccessToken(token);
        return token.access_token;
    } else {
        await clearAccessToken();
        throw Error(`No 'refresh_token'`);
    }
}

async function revokeAccessToken(): Promise<void> {
    if (soundcloudSettings.token) {
        await soundcloudApi.disconnect();
    }
}

async function storeAccessToken(token: SoundCloud.Token): Promise<void> {
    try {
        clearTimeout(refreshTokenTimerId);
        soundcloudSettings.token = token;
        await nextAccessToken(token.access_token);
        refreshTokenTimerId = setTimeout(
            () => refreshToken(),
            Math.max(token.expires_in - 60, 10) * 1000
        ) as any;
    } catch (err) {
        logger.error(err);
        connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        await clearAccessToken();
    }
}

async function nextAccessToken(access_token: string): Promise<void> {
    await checkConnection();
    accessToken$.next(access_token);
}

async function clearAccessToken(): Promise<void> {
    clearTimeout(refreshTokenTimerId);
    soundcloudSettings.token = null;
    await createCodeVerifier();
    accessToken$.next('');
}

async function createCodeVerifier(): Promise<void> {
    const codeVerifier = generateRandomString(64);
    soundcloudSettings.codeVerifier = codeVerifier;
    code_challenge = await generateCodeChallenge(codeVerifier);
}

async function checkConnection(): Promise<void> {
    const me = await soundcloudApi.getMe();
    soundcloudSettings.userId = me.id;
}

if (window.isSecureContext && !isConnected()) {
    try {
        createCodeVerifier();
    } catch (err) {
        logger.error(err);
    }
}
