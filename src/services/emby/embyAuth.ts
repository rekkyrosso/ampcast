import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {showEmbyLoginDialog} from './components/EmbyLoginDialog';
import embySettings from './embySettings';
import embyApi from './embyApi';

const logger = new Logger('embyAuth');

const accessToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
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

async function checkConnection(): Promise<boolean> {
    try {
        const libraries = await embyApi.getMusicLibraries();
        embySettings.libraries = libraries;
        return true;
    } catch (err) {
        logger.error(err);
        accessToken$.next(''); // Keep it in settings (it might be a temporary failure)
        return false;
    }
}

observeAccessToken()
    .pipe(
        filter((token) => token !== ''),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

setAccessToken(embySettings.token);
