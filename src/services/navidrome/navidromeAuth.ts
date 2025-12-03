import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
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

export async function login(mode?: 'silent'): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            connectionLogging$.next('');
            let returnValue = '';
            if (mode === 'silent') {
                connecting$.next(true);
                if (hasProxyLogin(navidrome)) {
                    const host = getServerHost(navidrome);
                    returnValue = await navidromeApi.login(host, '', '', true);
                } else {
                    throw Error('No credentials');
                }
            } else {
                returnValue = await showNavidromeLoginDialog();
            }
            if (returnValue) {
                const {userId, token, credentials} = JSON.parse(returnValue);
                navidromeSettings.userId = userId;
                navidromeSettings.credentials = credentials;
                setAccessToken(token);
                navidromeSettings.connectedAt = Date.now();
            }
        } catch (err) {
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        }
        connecting$.next(false);
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    navidromeSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
    navidromeSettings.connectedAt = 0;
    connecting$.next(false);
}

export async function reconnect(): Promise<void> {
    const token = navidromeSettings.token;
    if (token) {
        connecting$.next(true);
        accessToken$.next(token);
    } else if (hasProxyLogin(navidrome)) {
        await login('silent');
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
        const [libraries] = await Promise.all([
            subsonicApi.getMusicLibraries(),
            navidromeApi.get('playlist', {_end: 1}),
        ]);
        navidromeSettings.libraries = libraries;
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            navidromeSettings.clear();
            connectionLogging$.next('Not authorized');
        } else {
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        }
        accessToken$.next('');
        return false;
    } finally {
        connecting$.next(false);
    }
}
