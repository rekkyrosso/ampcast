import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {getReadableErrorMessage} from 'services/errors';
import {getServerHost, hasProxyLogin} from 'services/mediaServices/buildConfig';
import {showNavidromeLoginDialog} from './components/NavidromeLoginDialog';
import navidromeApi from './navidromeApi';
import subsonicApi from './subsonicApi';
import navidromeSettings from './navidromeSettings';
import navidrome from './navidrome';

const logger = new Logger('navidromeAuth');

const accessToken$ = new BehaviorSubject('');
const connecting$ = new BehaviorSubject(false);
const connectionLogging$ = new Subject<string>();
const isLoggedIn$ = new BehaviorSubject(false);

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function observeConnecting(): Observable<boolean> {
    return connecting$.pipe(distinctUntilChanged());
}

export function observeConnectionLogging(): Observable<string> {
    return connectionLogging$;
}

export function isConnected(): boolean {
    return !!navidromeSettings.connectedAt;
}

export function isLoggedIn(): boolean {
    return isLoggedIn$.value;
}

export function observeIsLoggedIn(): Observable<boolean> {
    return isLoggedIn$.pipe(distinctUntilChanged());
}

export async function login(mode?: 'silent', userName = '', password = ''): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            connectionLogging$.next('');
            let returnValue = '';
            if (mode === 'silent') {
                connecting$.next(true);
                if (userName && password) {
                    returnValue = await navidromeApi.login(
                        navidromeSettings.host,
                        userName,
                        password
                    );
                } else if (hasProxyLogin(navidrome)) {
                    const host = getServerHost(navidrome);
                    returnValue = await navidromeApi.login(host, '', '', true);
                } else {
                    throw Error('No credentials');
                }
            } else {
                returnValue = await showNavidromeLoginDialog(() => connecting$.next(true));
            }
            if (returnValue) {
                const {userId, token, credentials} = JSON.parse(returnValue);
                navidromeSettings.userId = userId;
                navidromeSettings.credentials = credentials;
                setAccessToken(token);
                navidromeSettings.connectedAt = Date.now();
            } else {
                throw Error('Cancelled');
            }
        } catch (err) {
            connecting$.next(false);
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    await navidromeSettings.savePassword('');
    navidromeSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
    navidromeSettings.connectedAt = 0;
    connecting$.next(false);
}

export async function reconnect(): Promise<void> {
    const userName = navidromeSettings.userName;
    if (ampcastElectron && userName) {
        const password = await navidromeSettings.getPassword();
        if (password) {
            await login('silent', userName, password);
            return;
        }
    }
    if (hasProxyLogin(navidrome)) {
        await login('silent');
    } else {
        const token = navidromeSettings.token;
        if (token) {
            connecting$.next(true);
            accessToken$.next(token);
        }
    }
}

function setAccessToken(token: string): void {
    navidromeSettings.token = token;
    accessToken$.next(token);
}

observeAccessToken()
    .pipe(
        filter((token) => token !== ''),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

async function checkConnection(): Promise<boolean> {
    try {
        const [libraries, pingData] = await Promise.all([
            subsonicApi.getMusicLibraries(),
            subsonicApi.ping(),
            navidromeApi.get('playlist', {_end: 1}),
        ]);
        navidromeSettings.libraries = libraries;
        navidromeSettings.serverVersion = pingData.serverVersion || '0.0.0';
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            navidromeSettings.clear();
            connectionLogging$.next('Not authorized');
            accessToken$.next('');
            return false;
        } else {
            logger.error(err);
            connectionLogging$.next('Connected with errors');
            return true;
        }
    } finally {
        connecting$.next(false);
    }
}
