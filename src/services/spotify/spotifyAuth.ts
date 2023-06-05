import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import Auth from 'types/Auth';
import {sp_client_id} from 'services/credentials';
import {Logger} from 'utils';
import spotifyApi from './spotifyApi';
import {authSettings, userSettings} from './spotifySettings';

console.log('module::spotifyAuth');

const logger = new Logger('spotifyAuth');

const host = location.hostname;
const base = host === 'localhost' ? `http://${host}:${location.port}` : `https://${host}`;
const redirect_uri = `${base}/auth/spotify/callback/`;
const spotifyAccounts = `https://accounts.spotify.com`;

let code_challenge: string;

interface TokenResponse {
    access_token: string;
    expires_in: number; // seconds
    refresh_token: string;
}

interface TokenStore {
    access_token: string;
    expires_at: Date;
    refresh_token: string;
}

const accessToken$ = new BehaviorSubject('');

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
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
        logger.log('login');
        try {
            const token = await obtainAccessToken();
            await storeAccessToken(token);
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('logout');
    await clearAccessToken();
}

// From: https://github.com/JMPerez/spotify-dedup/blob/master/dedup/oauthManager.ts

async function obtainAccessToken(): Promise<TokenResponse> {
    return new Promise((resolve, reject) => {
        let authWindow: Window | null = null;

        const receiveMessage = (event: {origin: string; data: {code: string}}) => {
            if (/(localhost|ampcast)/.test(event.origin)) {
                clearInterval(pollAuthWindowClosed);
                window.removeEventListener('message', receiveMessage, false);
                authWindow?.close();
                authWindow = null;

                if (event.origin !== location.origin) {
                    reject({message: `Origin ${event.origin} does not match ${location.origin}`});
                    return;
                }

                exchangeToken(event.data.code).then(resolve, reject);
            }
        };

        window.addEventListener('message', receiveMessage, false);

        const spotifyScopes = [
            // Listening History
            'user-read-recently-played',
            'user-read-playback-position',
            'user-top-read',
            // Spotify Connect
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            // Playback SDK requirements
            'streaming',
            'user-read-email',
            'user-read-private',
            // Playlists
            'playlist-read-private',
            'playlist-modify-private',
            'playlist-modify-public',
            // Library
            'user-library-read',
            'user-library-modify',
        ];

        const params = new URLSearchParams({
            client_id: sp_client_id,
            scope: spotifyScopes.join(' '),
            redirect_uri,
            response_type: 'code',
            code_challenge_method: 'S256',
            code_challenge,
        });

        authWindow = window.open(`${spotifyAccounts}/authorize?${params}`, 'Spotify', 'popup');

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(pollAuthWindowClosed);
                reject({message: 'access_denied'});
            }
        }, 500);
    });
}

// https://github.com/tobika/spotify-auth-PKCE-example/blob/main/public/main.js

function generateRandomString(length: number): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

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

async function exchangeToken(code: string): Promise<TokenResponse> {
    const code_verifier = authSettings.getString('code_verifier');

    const response = await fetch(`${spotifyAccounts}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
            client_id: sp_client_id,
            grant_type: 'authorization_code',
            code,
            redirect_uri,
            code_verifier,
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
    const token = getAccessToken();
    const refresh_token = token?.refresh_token;
    if (refresh_token) {
        const response = await fetch(`${spotifyAccounts}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: new URLSearchParams({
                client_id: sp_client_id,
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

async function storeAccessToken(token: TokenResponse): Promise<void> {
    try {
        const {access_token, refresh_token} = token;
        authSettings.setJson('token', {access_token, refresh_token});
        spotifyApi.setAccessToken(token.access_token);
        await getUserInfo();
        nextAccessToken(access_token);
    } catch (err) {
        logger.error(err);
        await clearAccessToken();
    }
}

function getAccessToken(): TokenStore | null {
    return authSettings.getJson<TokenStore>('token');
}

function nextAccessToken(access_token: string): void {
    logger.log('Access token successfully obtained.');
    accessToken$.next(access_token);
}

async function clearAccessToken(): Promise<void> {
    authSettings.removeItem('token');
    userSettings.clear();
    await createCodeVerifier();
    accessToken$.next('');
}

async function createCodeVerifier(): Promise<void> {
    const code_verifier = generateRandomString(64);
    authSettings.setString('code_verifier', code_verifier);
    code_challenge = await generateCodeChallenge(code_verifier);
}

async function getUserInfo(): Promise<void> {
    if (!userSettings.getString('userId')) {
        const me = await spotifyApi.getMe();
        userSettings.setString('userId', me.id);
        userSettings.setString('market', me.country);
    }
}

const spotifyAuth: Auth = {
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default spotifyAuth;

(async function (): Promise<void> {
    try {
        const token = getAccessToken();
        if (token) {
            try {
                spotifyApi.setAccessToken(token.access_token);
                await getUserInfo();
                nextAccessToken(token.access_token);
            } catch (err: any) {
                if (err.status === 401) {
                    await refreshToken();
                } else {
                    throw err;
                }
            }
            return;
        }
    } catch (err) {
        logger.error(err);
    }
    await clearAccessToken();
})();
