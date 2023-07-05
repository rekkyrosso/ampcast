import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, tap} from 'rxjs';
import {Logger} from 'utils';
import {showNavidromeLoginDialog} from './components/NavidromeLoginDialog';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';

console.log('module::navidromeAuth');

const logger = new Logger('navidromeAuth');

const accessToken$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

function observeAccessToken(): Observable<string> {
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
            const returnValue = await showNavidromeLoginDialog();
            if (returnValue) {
                const {userId, token, credentials} = JSON.parse(returnValue);
                navidromeSettings.userId = userId;
                navidromeSettings.credentials = credentials;
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
    navidromeSettings.clear();
    setAccessToken('');
    isLoggedIn$.next(false);
}

function setAccessToken(token: string): void {
    navidromeSettings.token = token;
    if (token) {
        logger.log('Access token successfully obtained');
    }
    accessToken$.next(token);
}

setAccessToken(navidromeSettings.token);

observeAccessToken()
    .pipe(
        filter((token) => token !== ''),
        tap(async () => {
            try {
                await navidromeApi.get('playlist', {_end: 1});
                isLoggedIn$.next(true);
            } catch (err) {
                logger.log(err);
                setAccessToken('');
                isLoggedIn$.next(false);
            }
        })
    )
    .subscribe(logger);
