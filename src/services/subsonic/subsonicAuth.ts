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

export function isConnected(): boolean {
    return !!subsonicSettings.credentials;
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

observeCredentials()
    .pipe(
        filter((credentials) => credentials !== ''),
        mergeMap(() => checkConnection())
    )
    .subscribe(isLoggedIn$);

async function checkConnection(): Promise<boolean> {
    try {
        const libraries = await subsonicApi.getMusicLibraries();
        subsonicSettings.libraries = libraries;
        return true;
    } catch (err: any) {
        if (err.code === 40) {
            subsonicSettings.credentials = '';
        } else {
            logger.error(err);
        }
        credentials$.next('');
        return false;
    }
}

credentials$.next(subsonicSettings.credentials);
