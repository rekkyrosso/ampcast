import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {exists, getSupportedDrm, Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi, {musicProviderHost} from './plexApi';

const logger = new Logger('plexAuth');
const apiHost = `https://plex.tv/api/v2`;

const serverToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);
const connectionStatus$ = new Subject<string>();

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

export function observeConnectionStatus(): Observable<string> {
    return connectionStatus$.pipe(distinctUntilChanged());
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            connectionStatus$.next('');
            const {id, userToken, serverToken} = await obtainUserToken();
            plexSettings.userId = id;
            plexSettings.userToken = userToken;
            serverToken$.next(serverToken);
        } catch (err) {
            logger.error(err);
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
                            connectionStatus$.next('Timeout');
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
    const connection = plexSettings.connection;
    if (connection) {
        const connectionType = connection.local ? 'local' : 'public';
        connectionStatus$.next(`Trying existing ${connectionType} connection...`);
        if (await testConnection(connection, plexSettings.serverToken)) {
            return;
        } else {
            plexSettings.server = null;
            plexSettings.connection = null;
        }
    }

    connectionStatus$.next(`Searching for ${connection ? 'a new' : 'a'} connection...`);

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

    if (servers.length === 0) {
        const message = 'Could not find a Plex server';
        connectionStatus$.next(message);
        throw Error(message);
    }

    for (const server of servers) {
        // TODO: Allow server choices...
        const attempts = await Promise.all([
            ...server.connections.map((connection) =>
                testConnection(connection, server.accessToken)
            ),
        ]);
        const connections = attempts.filter(exists);
        if (connections.length > 0) {
            // TODO: Allow connection choices...
            const connection = connections.find((connection) => connection.local) || connections[0];
            plexSettings.server = server;
            plexSettings.connection = connection;
            connectionStatus$.next(`Using ${connection.local ? 'local' : 'public'} connection`);
            return;
        }
    }

    const message = 'Could not establish a connection';
    connectionStatus$.next(message);
    throw Error(message);
}

async function testConnection(
    connection: plex.Connection,
    token: string
): Promise<plex.Connection | null> {
    const connectionType = connection.local ? 'local' : 'public';
    try {
        await plexApi.fetch({
            host: connection.uri,
            path: '/',
            method: 'HEAD',
            token,
            timeout: 3000,
        });
        connectionStatus$.next(`${connectionType} connection successful`);
        return connection;
    } catch (err) {
        connectionStatus$.next(`${connectionType} connection failed`);
        return null;
    }
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
        connectionStatus$.next('Connected successfully');
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            plexSettings.clear();
            serverToken$.next('');
            connectionStatus$.next('Connection failed');
            return false;
        } else {
            logger.error(err);
            connectionStatus$.next('Connected with errors');
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

observeConnectionStatus().subscribe(logger.rx());

serverToken$.next(plexSettings.serverToken);
