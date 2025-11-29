import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import {nanoid} from 'nanoid';
import {Logger} from 'utils';
import ibroadcastSettings from './ibroadcastSettings';
import ibroadcastApi from './ibroadcastApi';

const logger = new Logger('ibroadcastAuth');

const ibroadcastOAuth = `https://oauth.ibroadcast.com`;

let code_challenge: string;
let refreshTokenTimerId = 0;

interface TokenResponse {
    access_token: string;
    expires_in: number; // seconds
    refresh_token: string;
}

const accessToken$ = new BehaviorSubject('');

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!ibroadcastSettings.token;
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
            const secret = nanoid();
            const token = await obtainAccessToken(secret);
            await storeAccessToken(token);
        } catch (err) {
            await clearAccessToken();
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
    ibroadcastSettings.clear();
    await clearAccessToken();
}

export async function reconnect(): Promise<void> {
    try {
        if (ibroadcastSettings.token) {
            await refreshToken();
            return;
        }
    } catch (err) {
        logger.error(err);
    }
    await clearAccessToken();
}

export async function getRedirectUri(): Promise<string> {
    return `${location.origin}/auth/ibroadcast/callback/`;
}

async function obtainAccessToken(state: string): Promise<TokenResponse> {
    const redirectUri = await getRedirectUri();

    return new Promise((resolve, reject) => {
        let authWindow: Window | null = null;

        const receiveMessage = (event: {
            origin: string;
            data: {code: string; state: string; ibroadcast_callback: boolean};
        }) => {
            if (event.data?.ibroadcast_callback) {
                clearInterval(pollAuthWindowClosed);
                window.removeEventListener('message', receiveMessage, false);
                authWindow?.close();
                authWindow = null;

                if (event.origin !== location.origin) {
                    reject({message: `Origin ${event.origin} does not match ${location.origin}`});
                    return;
                }

                if (event.data.state !== state) {
                    reject({message: 'State mismatch'});
                    return;
                }

                exchangeToken(event.data.code).then(resolve, reject);
            }
        };

        window.addEventListener('message', receiveMessage, false);

        const ibroadcastScopes = ['user.account:read', 'user.library:read', 'user.library:write'];

        const params = new URLSearchParams({
            client_id: ibroadcastSettings.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            code_challenge_method: 'S256',
            code_challenge,
            scope: ibroadcastScopes.join(' '),
            state,
        });

        authWindow = window.open(`${ibroadcastOAuth}/authorize?${params}`, 'iBroadcast', 'popup');

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(pollAuthWindowClosed);
                reject({message: 'access_denied'});
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

async function exchangeToken(token: string): Promise<TokenResponse> {
    const redirectUri = await getRedirectUri();
    const response = await fetch(`${ibroadcastOAuth}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
            client_id: ibroadcastSettings.clientId,
            grant_type: 'authorization_code',
            code: token,
            redirect_uri: redirectUri,
            code_verifier: ibroadcastSettings.codeVerifier,
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
    const token = ibroadcastSettings.token;
    const refresh_token = token?.refresh_token;
    if (refresh_token) {
        const response = await fetch(`${ibroadcastOAuth}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: new URLSearchParams({
                client_id: ibroadcastSettings.clientId,
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
    const token = ibroadcastSettings.token;
    const refresh_token = token?.refresh_token;
    if (refresh_token) {
        const response = await fetch(`${ibroadcastOAuth}/revoke`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: new URLSearchParams({
                client_id: ibroadcastSettings.clientId,
                refresh_token,
            }),
        });
        if (!response.ok) {
            throw response;
        }
    }
}

async function storeAccessToken(token: TokenResponse): Promise<void> {
    try {
        clearTimeout(refreshTokenTimerId);
        ibroadcastSettings.token = token;
        await nextAccessToken(token.access_token);
        refreshTokenTimerId = setTimeout(
            () => refreshToken(),
            Math.max(token.expires_in - 60, 10) * 1000
        ) as any;
    } catch (err) {
        logger.error(err);
        await clearAccessToken();
    }
}

async function nextAccessToken(access_token: string): Promise<void> {
    await checkConnection();
    accessToken$.next(access_token);
}

async function clearAccessToken(): Promise<void> {
    clearTimeout(refreshTokenTimerId);
    ibroadcastSettings.token = null;
    await createCodeVerifier();
    accessToken$.next('');
}

async function createCodeVerifier(): Promise<void> {
    const codeVerifier = generateRandomString(64);
    ibroadcastSettings.codeVerifier = codeVerifier;
    code_challenge = await generateCodeChallenge(codeVerifier);
}

async function checkConnection(): Promise<void> {
    const {user, authenticated, message} = await ibroadcastApi.getStatus();
    if (authenticated) {
        ibroadcastSettings.userId = user.id;
    } else {
        throw Error(message || 'Not authenticated');
    }
}

if (window.isSecureContext && !isConnected()) {
    try {
        createCodeVerifier();
    } catch (err) {
        logger.error(err);
    }
}
