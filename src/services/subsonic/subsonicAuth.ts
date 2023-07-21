import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {showSubsonicLoginDialog} from './components/SubsonicLoginDialog';
import subsonicSettings from './subsonicSettings';
import subsonicApi from './subsonicApi';

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
        logger.log('connect');
        try {
            const returnValue = await showSubsonicLoginDialog();
            if (returnValue) {
                const {userName, credentials} = JSON.parse(returnValue);
                subsonicSettings.userName = userName;
                setCredentials(credentials);
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    subsonicSettings.clear();
    setCredentials('');
    isLoggedIn$.next(false);
}

function setCredentials(credentials: string): void {
    subsonicSettings.credentials = credentials;
    credentials$.next(credentials);
}

async function checkConnection(): Promise<boolean> {
    try {
        const libraries = await subsonicApi.getMusicLibraries();
        subsonicSettings.libraries = libraries;
        return true;
    } catch (err) {
        logger.error(err);
        credentials$.next(''); // Keep it in settings (it might be a temporary failure)
        return false;
    }
}

observeCredentials()
    .pipe(
        filter((credentials) => credentials !== ''),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

setCredentials(subsonicSettings.credentials);
