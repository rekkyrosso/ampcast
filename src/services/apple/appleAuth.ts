import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import {am_dev_token} from 'services/credentials';
import {loadScript, Logger} from 'utils';
import appleSettings from './appleSettings';
import MusicKitV1Wrapper from './MusicKitV1Wrapper';

console.log('module::appleAuth');

const logger = new Logger('appleAuth');

const isLoggedIn$ = new BehaviorSubject(false);

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
            const musicKit = await getMusicKit();
            await musicKit.authorize();
            logger.log('Access token successfully obtained');
            isLoggedIn$.next(true);
        } catch (err) {
            logger.log('Could not obtain access token');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('logout');
    const musicKit = await getMusicKit();
    try {
        if (musicKit.isPlaying) {
            musicKit.stop();
        }
        if (!musicKit.queue.isEmpty) {
            await musicKit.setQueue({});
        }
    } catch (err) {
        logger.error(err);
    }
    try {
        await musicKit.unauthorize();
    } catch (err) {
        logger.error(err);
    }
    isLoggedIn$.next(false);
}

export async function refreshToken(): Promise<void> {
    logger.log('refreshToken');
    // Apple Music doesn't support token refresh so we'll force a new login.
    await logout();
    throw Error(`Access token refresh is not supported.`);
}

async function getMusicKit(): Promise<MusicKit.MusicKitInstance> {
    if (window.MusicKit) {
        return MusicKit.getInstance();
    } else {
        return new Promise((resolve, reject) => {
            const version = appleSettings.useMusicKitBeta ? 3 : 1;
            loadScript(`https://js-cdn.music.apple.com/musickit/v${version}/musickit.js`).then(
                undefined,
                reject
            );
            document.addEventListener('musickitloaded', async () => {
                logger.log(`Loaded MusicKit version`, MusicKit.version);
                // Wrap MusicKit v1.
                if (window.MusicKit.version.startsWith('1')) {
                    window.MusicKit = new MusicKitV1Wrapper(MusicKit) as any;
                }
                try {
                    // MusicKit v3 is async but the types are still v1.
                    const instance = await window.MusicKit.configure({
                        developerToken: am_dev_token,
                        app: {
                            name: __app_name__,
                            build: __app_version__,
                        },
                        sourceType: 8, // "WEBPLAYER"
                        suppressErrorDialog: true,
                    } as any);
                    resolve(instance);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
}

(async function (): Promise<void> {
    const musicKit = await getMusicKit();
    if (musicKit.isAuthorized) {
        await musicKit.authorize();
        logger.log('Access token successfully obtained');
        isLoggedIn$.next(true);
    }
    musicKit.addEventListener(MusicKit.Events.authorizationStatusDidChange, () => {
        logger.log('authorizationStatusDidChange', musicKit.isAuthorized);
        if (!musicKit.isAuthorized) {
            isLoggedIn$.next(false);
        }
    });
})();
