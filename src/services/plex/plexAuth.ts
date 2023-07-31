import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap, tap} from 'rxjs';
import {exists, getSupportedDrm, Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi, {musicProviderHost} from './plexApi';

const logger = new Logger('plexAuth');
const apiHost = `https://plex.tv/api/v2`;

const userToken$ = new BehaviorSubject('');
const isConnected$ = new BehaviorSubject(false);
const isLoggedIn$ = new BehaviorSubject(false);

let pin: plex.Pin;
export async function refreshPin(): Promise<plex.Pin> {
    pin = await plexApi.fetchJSON<plex.Pin>({
        host: apiHost,
        path: `/pins`,
        method: 'POST',
        params: {strong: 'true'},
    });
    return pin;
}

function observeUserToken(): Observable<string> {
    return userToken$.pipe(distinctUntilChanged());
}

export function isLoggedIn(): boolean {
    return isLoggedIn$.getValue();
}

export function observeIsLoggedIn(): Observable<boolean> {
    return isLoggedIn$.pipe(distinctUntilChanged());
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            const {id, userToken} = await obtainUserToken();
            plexSettings.userId = id;
            setUserToken(userToken);
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    plexSettings.clear();
    setUserToken('');
    isConnected$.next(false);
    isLoggedIn$.next(false);
}

function setUserToken(userToken: string): void {
    plexSettings.userToken = userToken;
    userToken$.next(userToken);
}

async function testConnection(
    connection: plex.Connection,
    token: string
): Promise<plex.Connection | null> {
    try {
        await plexApi.fetch({
            host: connection.uri,
            path: '/',
            method: 'HEAD',
            token,
        });
        return connection;
    } catch (err) {
        return null;
    }
}

async function establishConnection(authToken: string): Promise<void> {
    const connection = plexSettings.connection;
    if (connection) {
        if (await testConnection(connection, plexSettings.serverToken)) {
            logger.log(`Using existing ${connection.local ? 'local' : 'public'} connection.`);
            return;
        } else {
            plexSettings.server = null;
            plexSettings.connection = null;
        }
    }

    logger.log(`Searching for a connection...`);

    const fetchResources = async function (): Promise<plex.Device[]> {
        return plexApi.fetchJSON({
            host: apiHost,
            path: '/resources',
            params: {includeHttps: '1'},
            token: authToken,
        });
    };
    const resources = await fetchResources();
    const servers = resources.filter((resource) => resource.provides === 'server');

    for (const server of servers) {
        const attempts = await Promise.all([
            ...server.connections.map((connection) =>
                testConnection(connection, server.accessToken)
            ),
        ]);
        const connections = attempts.filter(exists);
        if (connections.length) {
            const connection = connections.find((connection) => connection.local) || connections[0];
            plexSettings.server = server;
            plexSettings.connection = connection;
            logger.log(`Using ${connection.local ? 'local' : 'public'} connection.`);
            return;
        }
    }

    throw Error(`Could not establish a connection.`);
}

async function obtainUserToken(): Promise<{id: string; userToken: string}> {
    const {id, authToken} = await obtainServerToken();
    await establishConnection(authToken);
    const {authToken: userToken} = await plexApi.getAccount(authToken);
    return {id, userToken};
}

async function obtainServerToken(): Promise<{id: string; authToken: string}> {
    return new Promise((resolve, reject) => {
        const host = location.hostname;
        const base = host === 'localhost' ? `http://${host}:${location.port}` : `https://${host}`;
        const forwardUrl = `${base}/auth/plex/callback/`;
        const plexAuthHost = `https://app.plex.tv/auth`;

        let authWindow: Window | null = null;

        const receiveMessage = (event: {origin: string; data: any}) => {
            if (/(localhost|ampcast)/.test(event.origin)) {
                clearInterval(pollAuthWindowClosed);
                window.removeEventListener('message', receiveMessage, false);
                authWindow?.close();
                authWindow = null;

                if (event.origin !== location.origin) {
                    reject({message: `Origin ${event.origin} does not match ${location.origin}`});
                    return;
                }

                let attemptsRemaining = 10;

                const checkForToken = async () => {
                    attemptsRemaining--;
                    try {
                        const {authToken, id} = await plexApi.fetchJSON<plex.TokenResponse>({
                            host: apiHost,
                            path: `/pins/${pin.id}`,
                        });
                        if (authToken) {
                            resolve({id, authToken});
                        } else if (attemptsRemaining) {
                            setTimeout(checkForToken, 200);
                        } else {
                            reject('Timeout');
                        }
                    } catch (err) {
                        reject(err);
                    }
                };

                checkForToken();
            }
        };

        window.addEventListener('message', receiveMessage, false);

        const params = `clientID=${plexSettings.clientId}&code=${
            pin.code
        }&forwardUrl=${encodeURIComponent(
            forwardUrl
        )}&context%5Bdevice%5D%5Bproduct%5D=${__app_name__}`;

        authWindow = window.open(`${plexAuthHost}#?${params}`, 'Plex', 'popup');

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(pollAuthWindowClosed);
                reject({message: 'access_denied'});
            }
        }, 500);
    });
}

// Fix legacy plex
if (plexSettings.userToken === plexSettings.serverToken) {
    setUserToken('');
    if (plexSettings.serverToken && plexSettings.userId) {
        (async () => {
            const {authToken} = await plexApi.getAccount(plexSettings.serverToken);
            setUserToken(authToken);
        })();
    }
}

setUserToken(plexSettings.userToken);

observeUserToken()
    .pipe(
        filter((token) => !!token),
        mergeMap(() => Promise.all([getDrm(), getMusicLibraries(), checkTidalSubscription()])),
        tap(() => isLoggedIn$.next(true))
    )
    .subscribe(logger);

async function getDrm(): Promise<void> {
    try {
        const drm = await getSupportedDrm();
        plexSettings.drm = drm;
    } catch (err) {
        logger.error(err);
    }
}

async function getMusicLibraries(): Promise<void> {
    try {
        const libraries = await plexApi.getMusicLibraries();
        plexSettings.libraries = libraries;
    } catch (err) {
        logger.error(err);
    }
}

async function checkTidalSubscription(): Promise<void> {
    try {
        await plexApi.fetchJSON({
            host: musicProviderHost,
            path: '/playlists/all',
            params: {librarySectionID: 'tidal'},
            headers: {
                'X-Plex-Container-Size': '1',
            },
        });
        plexSettings.hasTidal = true;
    } catch (err: any) {
        if (err.status === 406) {
            plexSettings.hasTidal = false;
        } else {
            logger.error(err);
        }
    }
}
