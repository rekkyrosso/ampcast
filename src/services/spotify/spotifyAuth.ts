import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, map} from 'rxjs';
import {nanoid} from 'nanoid';
import {Logger} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {getReadableErrorMessage} from 'services/errors';
import spotifyApi from './spotifyApi';
import spotifySettings from './spotifySettings';

const isRestrictedApi = spotifySettings.restrictedApi;

const logger = new Logger('spotifyAuth');

const spotifyAccounts = `https://accounts.spotify.com`;

let code_challenge: string;
let refreshTokenTimerId = 0;

interface TokenResponse {
    access_token: string;
    expires_in: number; // seconds
    refresh_token: string;
}

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
            connecting$.next(true);
            connectionLogging$.next('');
            const secret = nanoid();
            const token = await obtainAccessToken(secret);
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
    spotifySettings.clear();
    connecting$.next(false);
    await clearAccessToken();
}

export async function reconnect(): Promise<void> {
    try {
        if (spotifySettings.token) {
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

export async function getRedirectUri(): Promise<string> {
    const authPath = '/auth/spotify/callback/';
    if (location.protocol === 'https:') {
        return `${location.origin}${authPath}`;
    } else {
        let address = '[::1]';
        if (ampcastElectron) {
            const localAddress = await ampcastElectron.getLocalhostIP();
            address = localAddress === '127.0.0.1' ? localAddress : '[::1]';
        }
        return `http://${address}:${location.port}${authPath}`;
    }
}

// Based on: https://github.com/JMPerez/spotify-dedup/blob/master/dedup/oauthManager.ts

async function obtainAccessToken(state: string): Promise<TokenResponse> {
    const redirectUri = await getRedirectUri();

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
            redirect_uri: redirectUri,
            response_type: 'code',
            code_challenge_method: 'S256',
            code_challenge,
            state,
        });

        authWindow = window.open(`${spotifyAccounts}/authorize?${params}`, 'Spotify', 'popup');

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(pollAuthWindowClosed);
                reject({message: 'Cancelled'});
            }
        }, 500);
    });
}

// https://github.com/tobika/spotify-auth-PKCE-example/blob/main/public/main.js

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
    const response = await fetch(`${spotifyAccounts}/api/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
            client_id: spotifySettings.clientId,
            grant_type: 'authorization_code',
            code: token,
            redirect_uri: redirectUri,
            code_verifier: spotifySettings.codeVerifier,
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
        clearTimeout(refreshTokenTimerId);
        spotifySettings.token = token;
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
                const {categories} = await spotifyApi.getCategories(0, 50, 'en_US');
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

if (window.isSecureContext && !isConnected()) {
    try {
        createCodeVerifier();
    } catch (err) {
        logger.error(err);
    }
}
