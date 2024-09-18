import type {Observable} from 'rxjs';
import type {Credentials} from '@tidal-music/common';
import {
    BehaviorSubject,
    distinctUntilChanged,
    EMPTY,
    filter,
    map,
    mergeMap,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs';
import {
    credentialsProvider,
    init as tidalAuth_init,
    initializeLogin as tidalAuth_initializeLogin,
    finalizeLogin as tidalAuth_finalizeLogin,
    logout as tidalAuth_logout,
} from '@tidal-music/auth';
import {nanoid} from 'nanoid';
import {LiteStorage, Logger} from 'utils';
import tidalSettings from './tidalSettings';
import tidalApi from './tidalApi';

const logger = new Logger('tidalAuth');
const authCallbacks = new LiteStorage('tidal/auth/callback');
const isLoggedIn$ = new BehaviorSubject(false);

export function isConnected(): boolean {
    return !!tidalSettings.connectedAt;
}

export function isLoggedIn(): boolean {
    return isLoggedIn$.value;
}

export function observeIsLoggedIn(): Observable<boolean> {
    return isLoggedIn$.pipe(distinctUntilChanged());
}

export async function login(): Promise<void> {
    if (!isLoggedIn()) {
        logger.log('connect');
        try {
            const secret = nanoid();
            await obtainCredentials(secret);
            const isLoggedIn = await checkConnection();
            isLoggedIn$.next(isLoggedIn);
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    tidalSettings.clear();
    tidalAuth_logout();
    isLoggedIn$.next(false);
}

async function obtainCredentials(state: string): Promise<Credentials> {
    const redirectUri = `${location.origin}/auth/tidal/callback/`;
    const loginConfig = {state};
    const loginUrl = await tidalAuth_initializeLogin({redirectUri, loginConfig});
    const loginResponse = await showLoginWindow(loginUrl, state);
    await tidalAuth_finalizeLogin(loginResponse);
    return credentialsProvider.getCredentials();
}

async function showLoginWindow(loginUrl: string, state: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const link = document.createElement('a');
        link.href = loginUrl;
        link.rel = 'noreferrer';
        link.target = '_blank';

        authCallbacks.setString(state, '(pending)');

        authCallbacks
            .observeChanges()
            .pipe(
                map(() => authCallbacks.getString(state)),
                filter((code) => code !== '(pending)'),
                take(1)
            )
            .subscribe((code) => {
                if (code) {
                    authCallbacks.clear();
                    resolve(`state=${state}&code=${code}`);
                } else {
                    reject('expired');
                }
            });

        link.click(); // Navigate to a new tab/window.
    });
}

async function checkConnection(): Promise<boolean> {
    try {
        const me = await tidalApi.getMe();
        tidalSettings.countryCode = me.attributes?.country || 'US';
        tidalSettings.userId = me.id;
        return true;
    } catch (err: any) {
        logger.error(err);
        return false;
    }
}

observeIsLoggedIn()
    .pipe(skipWhile((isLoggedIn) => !isLoggedIn))
    .subscribe((isLoggedIn) => (tidalSettings.connectedAt = isLoggedIn ? Date.now() : 0));

tidalSettings
    .observeCredentials()
    .pipe(
        filter(() => !tidalSettings.disabled),
        map(({clientId}) => clientId),
        switchMap((clientId) =>
            clientId
                ? tidalAuth_init({
                      clientId,
                      clientUniqueKey: tidalSettings.deviceId,
                      credentialsStorageKey: 'ampcast-auth',
                      scopes: [
                          'user.read',
                          'playback',
                          'playlists.read',
                          'collection.write',
                          'collection.read',
                          'recommendations.read',
                          'playlists.write',
                          'entitlements.read',
                      ],
                  })
                : EMPTY
        ),
        filter(() => isConnected()),
        mergeMap(() => checkConnection()),
        tap((isLoggedIn) => isLoggedIn$.next(isLoggedIn))
    )
    .subscribe(logger);
