import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger, partition, uniqBy} from 'utils';
import {getReadableErrorMessage} from 'services/errors';
import plexSettings from './plexSettings';
import plexApi, {apiHost} from './plexApi';

const logger = new Logger('plexAuth');

const accessToken$ = new BehaviorSubject('');
const connecting$ = new BehaviorSubject(false);
const connectionLogging$ = new Subject<string>();
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

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!plexSettings.server;
}

export function isLoggedIn(): boolean {
    return isLoggedIn$.value;
}

export function observeIsLoggedIn(): Observable<boolean> {
    return isLoggedIn$.pipe(distinctUntilChanged());
}

export function observeConnecting(): Observable<boolean> {
    return connecting$.pipe(distinctUntilChanged());
}

export function observeConnectionLogging(): Observable<string> {
    return connectionLogging$;
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            connecting$.next(true);
            connectionLogging$.next('');
            const {id, accessToken} = await connect();
            plexSettings.userId = id;
            accessToken$.next(accessToken);
        } catch (err) {
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
            await refreshPin();
        }
        connecting$.next(false);
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    plexSettings.clear();
    accessToken$.next('');
    isLoggedIn$.next(false);
    connecting$.next(false);
}

export async function reconnect(): Promise<void> {
    if (plexSettings.accessToken) {
        connecting$.next(true);
        accessToken$.next(plexSettings.accessToken);
    }
}

async function connect(): Promise<{id: string; accessToken: string}> {
    const {id, accessToken} = await obtainAccessToken();
    await establishConnection(accessToken);
    return {id, accessToken};
}

async function obtainAccessToken(): Promise<{id: string; accessToken: string}> {
    return new Promise((resolve, reject) => {
        const forwardUrl = `${location.origin}/auth/plex/callback/`;
        const plexAuthHost = `https://app.plex.tv/auth`;

        let authWindow: Window | null = null;

        const receiveMessage = (event: {origin: string; data: any}) => {
            if (event.data?.plex_callback) {
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
                        const {id, authToken: accessToken} =
                            await plexApi.fetchJSON<plex.TokenResponse>({
                                host: apiHost,
                                path: `/pins/${pin.id}`,
                            });
                        if (accessToken) {
                            resolve({id, accessToken});
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
                reject({message: 'Cancelled'});
            }
        }, 500);
    });
}

async function establishConnection(accessToken: string): Promise<void> {
    const {server, connection} = plexSettings;
    if (server && connection) {
        connectionLogging$.next('Trying existing connection…');
        if (await testConnection(server, connection)) {
            return;
        } else {
            plexSettings.server = null;
            plexSettings.connection = null;
        }
    }

    connectionLogging$.next(`Searching for ${connection ? 'a new' : 'a'} connection…`);

    const servers = await plexApi.getServers(accessToken);

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
    // Prefer direct (non-relay) connections.
    const [relayConnections, directConnections] = partition(
        server.connections,
        (connection) => connection.relay
    );
    // Prefer local connections.
    const [localConnections, remoteConnections] = partition(
        directConnections,
        (connection) => connection.local
    );
    const httpConnections: plex.Connection[] = [];
    if (location.protocol === 'http:' && !server.httpsRequired) {
        for (const connection of localConnections) {
            httpConnections.push({
                ...connection,
                address: 'localhost',
                protocol: 'http',
                uri: `http://localhost:${connection.port}`,
            });
        }
        for (const connection of localConnections) {
            httpConnections.push({
                ...connection,
                protocol: 'http',
                uri: `http://${connection.address}:${connection.port}`,
            });
        }
    }
    const connections = uniqBy('uri', [
        ...httpConnections,
        ...localConnections,
        ...remoteConnections,
        ...relayConnections,
    ]);
    for (const connection of connections) {
        const canConnect = await testConnection(server, connection);
        if (canConnect) {
            return connection;
        }
    }
    return null;
}

async function testConnection(server: plex.Device, connection: plex.Connection): Promise<boolean> {
    const log = (result: string) =>
        connectionLogging$.next(
            `[${server.name}] ${
                connection.relay ? 'relay' : connection.local ? 'local' : 'remote'
            } connection ${result} (${connection.uri})`
        );
    try {
        await plexApi.fetchJSON({
            host: connection.uri,
            path: '/library/sections',
            token: server.accessToken,
            timeout: connection.local ? 2_000 : 5_000,
        });
        log('successful');
        return true;
    } catch {
        log('failed');
        return false;
    }
}

observeAccessToken()
    .pipe(
        filter((token) => !!token),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

async function checkConnection(): Promise<boolean> {
    try {
        plexSettings.libraries = await plexApi.getMusicLibraries();
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            plexSettings.clear();
            accessToken$.next('');
            connectionLogging$.next('Connection failed');
            return false;
        } else {
            logger.error(err);
            connectionLogging$.next('Connected with errors');
            return true; // we're still logged in but some things might not work
        }
    } finally {
        connecting$.next(false);
    }
}

observeConnectionLogging()
    .pipe(filter((status) => status !== ''))
    .subscribe(logger.rx());
