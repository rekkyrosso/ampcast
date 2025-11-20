import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {getServerHost, hasProxyLogin} from 'services/mediaServices/buildConfig';
import {showEmbyLoginDialog} from './components/EmbyLoginDialog';
import embySettings from './embySettings';
import embyApi from './embyApi';
import emby from './emby';

const logger = new Logger('embyAuth');

const accessToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!embySettings.connectedAt;
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
                if (hasProxyLogin(emby)) {
                    returnValue = await embyApi.login(getServerHost(emby), '', '', true);
                } else {
                    logger.warn('No credentials for proxy login');
                }
            } else {
                returnValue = await showEmbyLoginDialog(emby, embySettings);
            }
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                embySettings.serverId = serverId;
                embySettings.userId = userId;
                setAccessToken(token);
                embySettings.connectedAt = Date.now();
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    embySettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
    embySettings.connectedAt = 0;
}

export async function reconnect(): Promise<void> {
    const token = embySettings.token;
    if (token) {
        accessToken$.next(token);
    } else if (hasProxyLogin(emby)) {
        await login('silent');
    }
}

function setAccessToken(token: string): void {
    embySettings.token = token;
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
            embyApi.getEndpointInfo(),
            embyApi.getMusicLibraries(),
        ]);
        embySettings.isLocal = !!(endpoint.IsLocal || endpoint.IsInNetwork);
        embySettings.libraries = libraries;
        return true;
    } catch (err: any) {
        if (err.status === 401) {
            embySettings.token = '';
        } else {
            logger.error(err);
        }
        accessToken$.next('');
        return false;
    }
}
