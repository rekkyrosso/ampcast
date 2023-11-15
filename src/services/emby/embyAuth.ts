import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {showEmbyLoginDialog} from './components/EmbyLoginDialog';
import embySettings from './embySettings';
import embyApi from './embyApi';

const logger = new Logger('embyAuth');

const accessToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!embySettings.token;
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
            const returnValue = await showEmbyLoginDialog();
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                embySettings.serverId = serverId;
                embySettings.userId = userId;
                setAccessToken(token);
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
        embySettings.isLocal = !!endpoint.IsLocal;
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

accessToken$.next(embySettings.token);
