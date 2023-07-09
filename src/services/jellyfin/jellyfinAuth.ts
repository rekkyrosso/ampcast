import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, map, mergeMap, tap} from 'rxjs';
import {showEmbyLoginDialog} from 'services/emby/components/EmbyLoginDialog';
import {Logger} from 'utils';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import jellyfin from './jellyfin';

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
        logger.log('connect');
        try {
            const returnValue = await showEmbyLoginDialog(jellyfin, jellyfinSettings);
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                jellyfinSettings.serverId = serverId;
                jellyfinSettings.userId = userId;
                setAccessToken(token);
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
}

function setAccessToken(token: string): void {
    jellyfinSettings.token = token;
    accessToken$.next(token);
}

observeAccessToken()
    .pipe(
        filter((token) => token !== ''),
        mergeMap(() => jellyfinApi.getMusicLibraries()),
        tap((libraries) => (jellyfinSettings.libraries = libraries)),
        map(
            (libraries) =>
                libraries.find((library) => library.id === jellyfinSettings.libraryId) ||
                libraries.find((library) => library.type === 'music')
        ),
        map((library) => library?.id || ''),
        tap((libraryId) => (jellyfinSettings.libraryId = libraryId)),
        tap(() => isLoggedIn$.next(true))
    )
    .subscribe(logger);

setAccessToken(jellyfinSettings.token);
