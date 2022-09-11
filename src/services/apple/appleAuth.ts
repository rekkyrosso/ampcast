import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {am_dev_token} from 'services/credentials';
import {loadScript, Logger} from 'utils';
import appleSettings from './appleSettings';
import MusicKitV1Wrapper from './MusicKitV1Wrapper';

console.log('module::appleAuth');

const logger = new Logger('appleAuth');

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
            const musicKit = await getMusicKit();
            const accessToken = await musicKit.authorize();
            logger.log('Access token successfully obtained.');
            accessToken$.next(accessToken);
        } catch (err) {
            logger.log('Could not obtain access token.');
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    await MusicKit.getInstance().unauthorize();
    accessToken$.next('');
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
                if (window.MusicKit.version.startsWith('1')) {
                    window.MusicKit = new MusicKitV1Wrapper(MusicKit) as any;
                }
                try {
                    const instance = await window.MusicKit.configure({
                        developerToken: am_dev_token,
                        app: {
                            name: __app_name__,
                            build: __app_version__,
                        },
                        sourceType: 8, // not sure where this number came from
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

export default {
    observeIsLoggedIn,
    login,
    logout,
};

(async function (): Promise<void> {
    const musicKit = await getMusicKit();
    if (musicKit.isAuthorized) {
        const accessToken = await musicKit.authorize();
        logger.log('Access token successfully obtained.');
        accessToken$.next(accessToken);
    }
})();
