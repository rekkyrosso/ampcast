import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, tap} from 'rxjs';
import {showEmbyLoginDialog} from 'services/emby/components/EmbyLoginDialog';
import {Logger} from 'utils';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import jellyfin from './jellyfin';

console.log('module::jellyfinAuth');

const logger = new Logger('jellyfinAuth');

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
        logger.log('login');
        try {
            const returnValue = await showEmbyLoginDialog(jellyfin, jellyfinSettings);
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                jellyfinSettings.serverId = serverId;
                jellyfinSettings.userId = userId;
                setAccessToken(token);
            }
        } catch (err) {
            logger.log('Could not obtain access token');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('logout');
    jellyfinSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
}

function setAccessToken(token: string): void {
    jellyfinSettings.token = token;
    if (token) {
        logger.log('Access token successfully obtained');
    }
    accessToken$.next(token);
}

setAccessToken(jellyfinSettings.token);

observeAccessToken()
    .pipe(
        filter((token) => token !== ''),
        tap(async () => {
            logger.log('Connected');
            try {
                const libraries = await jellyfinApi.getMusicLibraries();
                const library =
                    libraries.find((section) => section.id === jellyfinSettings.libraryId) ||
                    libraries.find((section) => section.type === 'music');
                jellyfinSettings.libraryId = library?.id || '';
                jellyfinSettings.libraries = libraries;
                isLoggedIn$.next(true);
            } catch (err) {
                logger.error(err);
                isLoggedIn$.next(false);
            }
        })
    )
    .subscribe(logger);
