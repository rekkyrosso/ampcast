import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, map, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {showListenBrainzLoginDialog} from './components/ListenBrainzLoginDialog';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

const logger = new Logger('listenbrainzAuth');

const accessToken$ = new BehaviorSubject('');

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function isConnected(): boolean {
    return !!listenbrainzSettings.token;
}

export function isLoggedIn(): boolean {
    return accessToken$.getValue() !== '';
}

export function observeIsLoggedIn(): Observable<boolean> {
    return observeAccessToken().pipe(
        map((token) => token !== ''),
        distinctUntilChanged()
    );
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            const returnValue = await showListenBrainzLoginDialog();
            if (returnValue) {
                const {userId, token} = JSON.parse(returnValue);
                listenbrainzSettings.userId = userId;
                listenbrainzSettings.token = token;
                accessToken$.next(token);
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    listenbrainzSettings.clear();
    accessToken$.next('');
}

observeAccessToken()
    .pipe(
        filter((token) => !!token),
        mergeMap(() => checkConnection())
    )
    .subscribe(logger);

async function checkConnection(): Promise<void> {
    try {
        await listenbrainzApi.getListenCount();
    } catch (err: any) {
        if (err.status === 401) {
            listenbrainzSettings.clear();
            accessToken$.next('');
        } else {
            logger.error(err);
        }
    }
}

accessToken$.next(listenbrainzSettings.token);
