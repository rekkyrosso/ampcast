import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {am_dev_token} from 'services/credentials';
import {loadScript, Logger} from 'utils';

console.log('module::appleAuth');

const logger = new Logger('appleAuth');

const scriptUrl = `https://js-cdn.music.apple.com/musickit/v3/musickit.js`;

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
            loadScript(scriptUrl).then(undefined, reject);
            document.addEventListener('musickitloaded', () => {
                const promise = MusicKit.configure({
                    developerToken: am_dev_token,
                    app: {
                        name: __app_name__,
                        build: __app_version__,
                    },
                    sourceType: 8, // not sure where this number came from
                    suppressErrorDialog: true,
                } as any) as unknown as Promise<MusicKit.MusicKitInstance>;
                promise.then(resolve, reject);
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
