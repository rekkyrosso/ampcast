import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, tap} from 'rxjs';
import {Logger} from 'utils';
import {showEmbyLoginDialog} from './components/EmbyLoginDialog';
import embySettings from './embySettings';
import embyApi from './embyApi';

console.log('module::embyAuth');

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
        logger.log('login');
        try {
            const returnValue = await showEmbyLoginDialog();
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                embySettings.serverId = serverId;
                embySettings.userId = userId;
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
    embySettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
}

function setAccessToken(token: string): void {
    embySettings.token = token;
    if (token) {
        logger.log('Access token successfully obtained');
    }
    accessToken$.next(token);
}

setAccessToken(embySettings.token);

observeAccessToken()
    .pipe(
        filter((token) => token !== ''),
        tap(async () => {
            logger.log('Connected');
            try {
                const libraries = await embyApi.getMusicLibraries();
                const library =
                    libraries.find((section) => section.id === embySettings.libraryId) ||
                    libraries.find((section) => section.type === 'music') ||
                    libraries.find((section) => section.type === 'audiobooks');
                embySettings.libraryId = library?.id || '';
                embySettings.libraries = libraries;
                isLoggedIn$.next(true);
            } catch (err) {
                logger.error(err);
                isLoggedIn$.next(false);
            }
        })
    )
    .subscribe(logger);
