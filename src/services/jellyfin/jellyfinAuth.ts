import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, tap} from 'rxjs';
import Auth from 'types/Auth';
import {Logger} from 'utils';
import {showJellyfinLoginDialog} from './components/JellyfinLoginDialog';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';

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
        try {
            const returnValue = await showJellyfinLoginDialog();
            if (returnValue) {
                const {serverId, userId, token} = JSON.parse(returnValue);
                jellyfinSettings.serverId = serverId;
                jellyfinSettings.userId = userId;
                setAccessToken(token);
            }
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    jellyfinSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
}

function setAccessToken(token: string): void {
    jellyfinSettings.token = token;
    if (token) {
        logger.log('Access token successfully obtained.');
    }
    accessToken$.next(token);
}

const jellyfinAuth: Auth = {
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default jellyfinAuth;

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
                    libraries.find((section) => /m[uú][sz](i|ie)[ckq]/i.test(section.title)) ||
                    libraries[0];
                jellyfinSettings.libraryId = library?.id || '';
                jellyfinSettings.libraries = libraries;
            } catch (err) {
                logger.error(err);
            } finally {
                isLoggedIn$.next(true);
            }
        })
    )
    .subscribe(logger);
