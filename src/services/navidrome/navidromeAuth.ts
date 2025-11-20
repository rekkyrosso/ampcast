import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {getServerHost, hasProxyLogin} from 'services/mediaServices/buildConfig';
import {showNavidromeLoginDialog} from './components/NavidromeLoginDialog';
import navidromeApi from './navidromeApi';
import subsonicApi from './subsonicApi';
import navidromeSettings from './navidromeSettings';
import navidrome from './navidrome';

const logger = new Logger('navidromeAuth');

const accessToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
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
            let returnValue = '';
            if (mode === 'silent') {
                if (hasProxyLogin(navidrome)) {
                    const host = getServerHost(navidrome);
                    returnValue = await navidromeApi.login(host, '', '', true);
                } else {
                    logger.warn('No credentials for proxy login');
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
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    navidromeSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
    navidromeSettings.connectedAt = 0;
}

export async function reconnect(): Promise<void> {
    const token = navidromeSettings.token;
    if (token) {
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
        } else {
            logger.error(err);
        }
        accessToken$.next('');
        return false;
    }
}
