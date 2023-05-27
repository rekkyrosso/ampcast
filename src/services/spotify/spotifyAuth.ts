import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import Auth from 'types/Auth';
import {sp_client_id} from 'services/credentials';
import {LiteStorage, Logger} from 'utils';

console.log('module::spotifyAuth');

const logger = new Logger('spotifyAuth');

export const authSettings = new LiteStorage('spotify/auth');

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
            storeAccessToken(token);
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('logout');
    clearAccessToken();
    await createCodeVerifier();
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
    const token = retrieveAccessToken();
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
            clearAccessToken();
            throw response;
        }
        const token = await response.json();
        storeAccessToken(token);
        return token.access_token;
    } else {
        clearAccessToken();
        throw Error(`No 'refresh_token'`);
    }
}

function storeAccessToken(token: TokenResponse): void {
    const {access_token, refresh_token, expires_in} = token;
    const now = new Date();
    const expires_at = new Date(now.setSeconds(now.getSeconds() + expires_in)).toISOString();
    authSettings.setJson('token', {access_token, refresh_token, expires_at});
    nextAccessToken(access_token);
}

function retrieveAccessToken(): TokenStore | null {
    const token = authSettings.getJson<TokenStore>('token');
    if (token) {
        token.expires_at = new Date(token.expires_at);
    }
    return token;
}

function nextAccessToken(access_token: string): void {
    logger.log('Access token successfully obtained.');
    accessToken$.next(access_token);
}

function clearAccessToken(): void {
    authSettings.removeItem('token');
    accessToken$.next('');
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
        const token = retrieveAccessToken();
        if (token) {
            const expiresIn = token.expires_at.getTime() - Date.now();
            if (expiresIn <= 0) {
                await refreshToken();
            } else {
                nextAccessToken(token.access_token);
            }
            return;
        }
    } catch (err) {
        logger.error(err);
        clearAccessToken();
    }
    await createCodeVerifier();
})();

async function createCodeVerifier(): Promise<void> {
    const code_verifier = generateRandomString(64);
    authSettings.setString('code_verifier', code_verifier);
    code_challenge = await generateCodeChallenge(code_verifier);
}
