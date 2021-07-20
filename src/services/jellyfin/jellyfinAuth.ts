import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import Auth from 'types/Auth';
import {Logger} from 'utils';
import settings from './jellyfinSettings';
import {showJellyfinLoginDialog} from 'components/Login/JellyfinLoginDialog';

console.log('module::jellyfinAuth');

const logger = new Logger('jellyfinAuth');

const accessToken$ = new BehaviorSubject('');

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

function isLoggedIn(): boolean {
    return getAccessToken() !== '';
}

export function observeIsLoggedIn(): Observable<boolean> {
    return observeAccessToken().pipe(
        map((token) => token !== ''),
        distinctUntilChanged()
    );
}

function getAccessToken(): string {
    return accessToken$.getValue();
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        try {
            const returnValue = await showJellyfinLoginDialog();
            const {userId, token} = JSON.parse(returnValue);
            settings.userId = userId;
            setAccessToken(token);
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    setAccessToken('');
}

function setAccessToken(token: string): void {
    if (token) {
        logger.log('Access token successfully obtained.');
    }
    settings.token = token;
    accessToken$.next(token);
}

const jellyfinAuth: Auth = {
    observeIsLoggedIn,
    login,
    logout,
};

export default jellyfinAuth;

setAccessToken(settings.token);
