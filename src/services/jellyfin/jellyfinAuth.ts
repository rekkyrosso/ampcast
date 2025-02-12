import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {getServerHost, hasProxyLogin} from 'services/buildConfig';
import {showEmbyLoginDialog} from 'services/emby/components/EmbyLoginDialog';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import jellyfin from './jellyfin';

const logger = new Logger('jellyfinAuth');

const accessToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!jellyfinSettings.connectedAt;
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
                if (hasProxyLogin(jellyfin)) {
                    returnValue = await jellyfinApi.login(getServerHost(jellyfin), '', '', true);
                } else {
                    logger.warn('No credentials for proxy login');
                }
            } else {
                returnValue = await showEmbyLoginDialog(jellyfin, jellyfinSettings);
            }
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                jellyfinSettings.serverId = serverId;
                jellyfinSettings.userId = userId;
                setAccessToken(token);
                jellyfinSettings.connectedAt = Date.now();
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    jellyfinSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
    jellyfinSettings.connectedAt = 0;
}

export async function reconnect(): Promise<void> {
    const token = jellyfinSettings.token;
    if (token) {
        accessToken$.next(token);
    } else if (hasProxyLogin(jellyfin)) {
        await login('silent');
    }
}

function setAccessToken(token: string): void {
    jellyfinSettings.token = token;
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
        const [endpoint, libraries] = await Promise.all([
            jellyfinApi.getEndpointInfo(),
            jellyfinApi.getMusicLibraries(),
        ]);
        jellyfinSettings.isLocal = !!(endpoint.IsLocal || endpoint.IsInNetwork);
        jellyfinSettings.libraries = libraries;
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            jellyfinSettings.token = '';
        } else {
            logger.error(err);
        }
        accessToken$.next('');
        return false;
    }
}
