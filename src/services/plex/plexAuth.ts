import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, filter, map, tap} from 'rxjs/operators';
import Auth from 'types/Auth';
import {exists, Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi from './plexApi';

console.log('module::plexAuth');

const logger = new Logger('plexAuth');
const apiHost = `https://plex.tv/api/v2`;

const accessToken$ = new BehaviorSubject('');
const isConnected$ = new BehaviorSubject(false);

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

function isLoggedIn(): boolean {
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
        try {
            const {id, authToken} = await obtainAccessToken();
            plexSettings.userId = id;
            setAccessToken(authToken);
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    isConnected$.next(false);
    setAccessToken('');
    plexSettings.clear();
}

function setAccessToken(token: string): void {
    plexSettings.userToken = token;
    if (token) {
        logger.log('Access token successfully obtained.');
    }
    accessToken$.next(token);
}

const plexAuth: Auth = {
    observeIsLoggedIn,
    login,
    logout,
};

export default plexAuth;

setAccessToken(plexSettings.userToken);

observeIsLoggedIn()
    .pipe(
        filter((isLoggedIn) => isLoggedIn),
        tap(async () => {
            const testConnection = async function (
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
            };

            const connection = plexSettings.connection;
            if (connection) {
                if (await testConnection(connection, plexSettings.serverToken)) {
                    logger.log(
                        `Using existing ${connection.local ? 'local' : 'public'} connection.`
                    );
                    isConnected$.next(true);
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
                });
            };

            try {
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
                        const connection =
                            connections.find((connection) => connection.local) || connections[0];
                        plexSettings.server = server;
                        plexSettings.connection = connection;
                        logger.log(`Using ${connection.local ? 'local' : 'public'} connection.`);
                        isConnected$.next(true);
                        return;
                    }
                }

                logger.log(`Could not establish a connection.`);
            } catch (err) {
                logger.log(err);
                setAccessToken('');
            }
        })
    )
    .subscribe(logger);

isConnected$
    .pipe(
        filter((isConnected) => isConnected),
        tap(async () => {
            logger.log('Connected');
            const {
                MediaContainer: {Directory: sections},
            } = await plexApi.fetchJSON<plex.DirectoryResponse>({
                path: '/library/sections',
            });
            const musicSection = sections.find((section) => section.type === 'artist');
            plexSettings.libraryId = musicSection?.key || '';
        })
    )
    .subscribe(logger);

async function obtainAccessToken(): Promise<{id: string; authToken: string}> {
    const pin = await plexApi.fetchJSON<plex.Pin>({
        host: apiHost,
        path: `/pins`,
        method: 'POST',
        params: {strong: 'true'},
    });

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
                            reject('Timeout.');
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

        authWindow = window.open(`${plexAuthHost}#?${params}`, `Plex`, `popup`);

        const pollAuthWindowClosed = setInterval(() => {
            if (authWindow?.closed) {
                clearInterval(pollAuthWindowClosed);
                reject({message: 'access_denied'});
            }
        }, 500);
    });
}
