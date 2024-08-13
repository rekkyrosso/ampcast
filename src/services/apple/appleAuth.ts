import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, skipWhile} from 'rxjs';
import {loadScript, Logger} from 'utils';
import appleSettings from './appleSettings';

const logger = new Logger('appleAuth');

const isLoggedIn$ = new BehaviorSubject(false);

export function isConnected(): boolean {
    return !!appleSettings.connectedAt;
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
            const musicKit = await getMusicKitInstance();
            const token = await musicKit.authorize();
            isLoggedIn$.next(!!token);
        } catch (err) {
            logger.error(err);
        }
    }
}

export async function logout(): Promise<void> {
    logger.log('disconnect');
    try {
        if (window.MusicKit) {
            const musicKit = await getMusicKitInstance();
            try {
                await musicKit.unauthorize();
            } catch (err) {
                logger.error(err);
            }
        }
    } catch {
        // MusicKit not loaded.
    }
    appleSettings.connectedAt = 0;
    appleSettings.favoriteSongsId = '';
    isLoggedIn$.next(false);
}

export async function refreshToken(): Promise<void> {
    // Apple Music doesn't support token refresh so we'll force a new login.
    await logout();
    throw Error('Unauthorized');
}

const musicKitPromise = new Promise<MusicKit.MusicKitInstance>((resolve, reject) => {
    document.addEventListener('musickitloaded', async () => {
        logger.log(`Loaded MusicKit version`, MusicKit.version);
        try {
            // MusicKit v3 is async but the types are still v1.
            const musicKit = await MusicKit.configure({
                developerToken: appleSettings.devToken,
                app: {
                    name: __app_name__,
                    build: __app_version__,
                },
                sourceType: 8, // "WEBPLAYER"
                suppressErrorDialog: true,
                bitrate: appleSettings.bitrate,
                // These look like they should do something but they don't.
                // logInfo: false,
                // isQA: false,
            } as any);
            musicKit.addEventListener(MusicKit.Events.authorizationStatusDidChange, async () => {
                const isLoggedIn = musicKit.isAuthorized;
                if (isLoggedIn) {
                    try {
                        await setFavoriteSongsId(musicKit);
                    } catch (err) {
                        logger.error(err);
                    }
                }
                isLoggedIn$.next(isLoggedIn);
            });
            resolve(musicKit);
        } catch (error) {
            reject(error);
        }
    });
});

export async function getMusicKitInstance(): Promise<MusicKit.MusicKitInstance> {
    if (window.MusicKit) {
        return MusicKit.getInstance();
    } else {
        if (!appleSettings.devToken) {
            throw Error('No developer token');
        }
        return new Promise((resolve, reject) => {
            loadScript('https://js-cdn.music.apple.com/musickit/v3/musickit.js').then(
                () => musicKitPromise.then(resolve, reject),
                reject
            );
        });
    }
}

async function setFavoriteSongsId(musicKit: MusicKit.MusicKitInstance): Promise<void> {
    if (!appleSettings.favoriteSongsId) {
        const {
            data: {data: playlists = []},
        } = await musicKit.api.music('/v1/me/library/playlists', {
            'extend[library-playlists]': 'tags',
            'fields[library-playlists]': 'tags',
        });
        const favoriteSongs = playlists.find((playlist: any) =>
            playlist.attributes?.tags?.includes('favorited')
        );
        if (favoriteSongs) {
            appleSettings.favoriteSongsId = favoriteSongs.id;
        }
    }
}

observeIsLoggedIn()
    .pipe(skipWhile((isLoggedIn) => !isLoggedIn))
    .subscribe((isLoggedIn) => (appleSettings.connectedAt = isLoggedIn ? Date.now() : 0));

(async () => {
    try {
        if (appleSettings.devToken && isConnected()) {
            const musicKit = await getMusicKitInstance();
            if (musicKit.isAuthorized) {
                await setFavoriteSongsId(musicKit);
                isLoggedIn$.next(true);
            }
        }
    } catch (err) {
        logger.error(err);
    }
})();
