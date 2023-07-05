import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, tap} from 'rxjs';
import {Logger} from 'utils';
import {showSubsonicLoginDialog} from './components/SubsonicLoginDialog';
import subsonicSettings from './subsonicSettings';
import subsonicApi from './subsonicApi';

console.log('module::subsonicAuth');

const logger = new Logger('subsonicAuth');

const credentials$ = new BehaviorSubject('');
const isLoggedIn$ = new BehaviorSubject(false);

function observeCredentials(): Observable<string> {
    return credentials$.pipe(distinctUntilChanged());
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
            const returnValue = await showSubsonicLoginDialog();
            if (returnValue) {
                const {userName, credentials} = JSON.parse(returnValue);
                subsonicSettings.userName = userName;
                setCredentials(credentials);
            }
        } catch (err) {
            logger.log('Could not obtain access token');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('logout');
    subsonicSettings.clear();
    setCredentials('');
    isLoggedIn$.next(false);
}

function setCredentials(credentials: string): void {
    subsonicSettings.credentials = credentials;
    if (credentials) {
        logger.log('Access token successfully obtained');
    }
    credentials$.next(credentials);
}

setCredentials(subsonicSettings.credentials);

observeCredentials()
    .pipe(
        filter((credentials) => credentials !== ''),
        tap(async () => {
            try {
                subsonicSettings.folders = await subsonicApi.getMusicFolders();
                isLoggedIn$.next(true);
            } catch (err) {
                logger.log(err);
                setCredentials('');
                isLoggedIn$.next(false);
            }
        })
    )
    .subscribe(logger);
