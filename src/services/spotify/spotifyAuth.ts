import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import {nanoid} from 'nanoid';
import {Logger} from 'utils';
import spotifyApi from './spotifyApi';
import spotifySettings from './spotifySettings';

const isRestrictedApi = spotifySettings.restrictedApi;

const logger = new Logger('spotifyAuth');

const redirect_uri = `${location.origin}/auth/spotify/callback/`;
const spotifyAccounts = `https://accounts.spotify.com`;

let code_challenge: string;

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
    return !!spotifySettings.token;
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
    spotifySettings.clear();
    await clearAccessToken();
}

export async function reconnect(): Promise<void> {
    const access_token = spotifySettings.token?.access_token;
    try {
        if (access_token) {
            try {
                await nextAccessToken(access_token);
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
}

// Based on: https://github.com/JMPerez/spotify-dedup/blob/master/dedup/oauthManager.ts

async function obtainAccessToken(state: string): Promise<TokenResponse> {
    return new Promise((resolve, reject) => {
        let authWindow: Window | null = null;

        const receiveMessage = (event: {
            origin: string;
            data: {code: string; state: string; spotify_callback: boolean};
        }) => {
            if (event.data?.spotify_callback) {
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

        const spotifyScopes = [
            // Listening History
            'user-read-recently-played',
            'user-read-playback-position',
            // 'user-top-read', // TODO: I forgot to add this scope when registering ampcast.app with Spotify.
            // Spotify Connect
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            // Spotify Playback SDK requirements
            'streaming',
            'user-read-email',
            'user-read-private',
            // Manage Playlists
            'playlist-read-private',
            'playlist-modify-private',
            'playlist-modify-public',
            // Manage Library
            'user-library-read',
            'user-library-modify',
            'user-follow-read',
            'user-follow-modify',
        ];

        const params = new URLSearchParams({
            client_id: spotifySettings.clientId,
            scope: spotifyScopes.join(' '),
            redirect_uri,
            state,
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
    const code_verifier = spotifySettings.codeVerifier;

    const response = await fetch(`${spotifyAccounts}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
            client_id: spotifySettings.clientId,
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
    const token = spotifySettings.token;
    const refresh_token = token?.refresh_token;
    if (refresh_token) {
        const response = await fetch(`${spotifyAccounts}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: new URLSearchParams({
                client_id: spotifySettings.clientId,
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
        spotifySettings.token = token;
        await nextAccessToken(token.access_token);
    } catch (err) {
        logger.error(err);
        await clearAccessToken();
    }
}

async function nextAccessToken(access_token: string): Promise<void> {
    spotifyApi.setAccessToken(access_token);
    await checkConnection();
    accessToken$.next(access_token);
}

async function clearAccessToken(): Promise<void> {
    spotifySettings.token = null;
    await createCodeVerifier();
    accessToken$.next('');
}

async function createCodeVerifier(): Promise<void> {
    const codeVerifier = generateRandomString(64);
    spotifySettings.codeVerifier = codeVerifier;
    code_challenge = await generateCodeChallenge(codeVerifier);
}

async function checkConnection(): Promise<void> {
    const getUserId = async () => {
        const me = await spotifyApi.getMe();
        spotifySettings.userId = me.id;
        spotifySettings.market = me.country;
    };
    const getChartsCategoryId = async () => {
        try {
            if (!isRestrictedApi && !spotifySettings.chartsCategoryId) {
                const {categories} = await spotifyApi.getCategories({limit: 50, locale: 'en_US'});
                const chartsCategory = categories.items.find(
                    (category) => category.name === 'Charts'
                );
                spotifySettings.chartsCategoryId = chartsCategory?.id || '';
            }
        } catch (err) {
            logger.error(err);
        }
    };
    await Promise.all([getUserId(), getChartsCategoryId()]);
}

if (!isConnected()) {
    createCodeVerifier();
}
