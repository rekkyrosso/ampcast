import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {getSupportedDrm, Logger, partition} from 'utils';
import plexSettings from './plexSettings';
import plexApi, {apiHost, musicProviderHost} from './plexApi';

const logger = new Logger('plexAuth');

const serverToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);
const connectionLogging$ = new Subject<string>();

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

function observeServerToken(): Observable<string> {
    return serverToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!plexSettings.server;
}

export function isLoggedIn(): boolean {
    return isLoggedIn$.getValue();
}

export function observeIsLoggedIn(): Observable<boolean> {
    return isLoggedIn$.pipe(distinctUntilChanged());
}

export function observeConnectionLogging(): Observable<string> {
    return connectionLogging$;
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            connectionLogging$.next('');
            const {id, userToken, serverToken} = await obtainUserToken();
            plexSettings.userId = id;
            plexSettings.userToken = userToken;
            serverToken$.next(serverToken);
        } catch (err) {
            logger.error(err);
            await refreshPin();
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    plexSettings.clear();
    serverToken$.next('');
    isLoggedIn$.next(false);
}

async function obtainUserToken(): Promise<{id: string; serverToken: string; userToken: string}> {
    const {id, serverToken} = await obtainServerToken();
    await establishConnection(serverToken);
    try {
        const {authToken: userToken} = await plexApi.getAccount(serverToken);
        return {id, serverToken, userToken};
    } catch (err) {
        return {id, serverToken, userToken: ''};
    }
}

async function obtainServerToken(): Promise<{id: string; serverToken: string}> {
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
                            resolve({id, serverToken: authToken});
                        } else if (attemptsRemaining) {
                            setTimeout(checkForToken, 200);
                        } else {
                            connectionLogging$.next('Timeout');
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

async function establishConnection(authToken: string): Promise<void> {
    const {server, connection} = plexSettings;
    if (server && connection) {
        const connectionType = connection.local ? 'local' : 'public';
        connectionLogging$.next(`Trying existing ${connectionType} connection…`);
        if (await testConnection(server, connection)) {
            return;
        } else {
            plexSettings.server = null;
            plexSettings.connection = null;
        }
    }

    connectionLogging$.next(`Searching for ${connection ? 'a new' : 'a'} connection…`);

    const servers = await plexApi.getServers(authToken);

    if (servers.length === 0) {
        const message = 'Could not find a Plex server';
        connectionLogging$.next(message);
        throw Error(message);
    }

    for (const server of servers) {
        const connection = await getConnection(server);
        if (connection) {
            plexSettings.server = server;
            plexSettings.connection = connection;
            return;
        }
    }

    const message = 'Could not establish a connection';
    connectionLogging$.next(message);
    throw Error(message);
}

export async function getConnection(server: plex.Device): Promise<plex.Connection | null> {
    // Prefer local connections.
    const connections = partition(server.connections, (connection) => connection.local).flat();
    for (const connection of connections) {
        const canConnect = await testConnection(server, connection);
        if (canConnect) {
            return connection;
        }
    }
    return null;
}

async function testConnection(server: plex.Device, connection: plex.Connection): Promise<boolean> {
    const name = server.name;
    const connectionType = connection.local ? 'local' : 'public';
    try {
        await plexApi.fetchJSON({
            host: connection.uri,
            path: '/library/sections',
            token: server.accessToken,
            timeout: 10_000,
        });
        connectionLogging$.next(`(${name}) ${connectionType} connection successful`);
        return true;
    } catch (err) {
        connectionLogging$.next(`(${name}) ${connectionType} connection failed`);
    }
    return false;
}

observeServerToken()
    .pipe(
        filter((token) => !!token),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

async function checkConnection(): Promise<boolean> {
    try {
        const [libraries] = await Promise.all([
            plexApi.getMusicLibraries(),
            getDrm(),
            checkTidalSubscription(),
        ]);
        plexSettings.libraries = libraries;
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            plexSettings.clear();
            serverToken$.next('');
            connectionLogging$.next('Connection failed');
            return false;
        } else {
            logger.error(err);
            connectionLogging$.next('Connected with errors');
            return true; // we're still logged in but some things might not work
        }
    }
}

async function getDrm(): Promise<void> {
    try {
        const drm = await getSupportedDrm();
        plexSettings.drm = drm;
    } catch (err) {
        logger.error(err);
    }
}

async function checkTidalSubscription(): Promise<void> {
    try {
        if (plexSettings.userToken) {
            await plexApi.fetchJSON({
                host: musicProviderHost,
                path: '/playlists/all',
                params: {librarySectionID: 'tidal'},
                headers: {
                    'X-Plex-Container-Size': '1',
                },
            });
            plexSettings.hasTidal = true;
        }
    } catch (err: any) {
        if (err.status === 406) {
            plexSettings.hasTidal = false;
        } else {
            logger.error(err);
        }
    }
}

observeConnectionLogging()
    .pipe(filter((status) => status !== ''))
    .subscribe(logger.rx());

serverToken$.next(plexSettings.serverToken);
