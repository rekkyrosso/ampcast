import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, map, mergeMap} from 'rxjs';
import {Logger} from 'utils';
import {getReadableErrorMessage} from 'services/errors';
import {showListenBrainzLoginDialog} from './components/ListenBrainzLoginDialog';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

const logger = new Logger('listenbrainzAuth');

const accessToken$ = new BehaviorSubject('');
const connecting$ = new BehaviorSubject(false);
const connectionLogging$ = new Subject<string>();

function observeAccessToken(): Observable<string> {
    return accessToken$.pipe(distinctUntilChanged());
}

export function observeConnecting(): Observable<boolean> {
    return connecting$.pipe(distinctUntilChanged());
}

export function observeConnectionLogging(): Observable<string> {
    return connectionLogging$;
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
            connectionLogging$.next('');
            const returnValue = await showListenBrainzLoginDialog();
            if (returnValue) {
                const {userId, token} = JSON.parse(returnValue);
                listenbrainzSettings.userId = userId;
                listenbrainzSettings.token = token;
                accessToken$.next(token);
            }
        } catch (err) {
            logger.error(err);
            connectionLogging$.next(`Failed to connect: '${getReadableErrorMessage(err)}'`);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    listenbrainzSettings.clear();
    accessToken$.next('');
}

export async function reconnect(): Promise<void> {
    const token = listenbrainzSettings.token;
    if (token) {
        connecting$.next(true);
        accessToken$.next(token);
    }
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
            connectionLogging$.next('Not authorized');
        } else {
            logger.error(err);
        }
    } finally {
        connecting$.next(false);
    }
}
