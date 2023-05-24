import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map} from 'rxjs';
import Auth from 'types/Auth';
import {Logger} from 'utils';
import {showJellyfinLoginDialog} from './components/JellyfinLoginDialog';
import jellyfinSettings from './jellyfinSettings';

console.log('module::jellyfinAuth');

const logger = new Logger('jellyfinAuth');

const accessToken$ = new BehaviorSubject('');

export function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isLoggedIn(): boolean {
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
    setAccessToken('');
    jellyfinSettings.clear();
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
