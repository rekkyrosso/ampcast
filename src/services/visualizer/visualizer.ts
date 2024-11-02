import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    delay,
    distinctUntilChanged,
    filter,
    map,
    skip,
    skipWhile,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import Visualizer, {NoVisualizer} from 'types/Visualizer';
import VisualizerFavorite from 'types/VisualizerFavorite';
import VisualizerProviderId from 'types/VisualizerProviderId';
import audio from 'services/audio';
import playback, {observeCurrentItem} from 'services/mediaPlayback/playback';
import youtubeApi from 'services/youtube/youtubeApi';
import {browser, exists, getRandomValue, isMiniPlayer, Logger} from 'utils';
import {
    getVisualizer,
    getVisualizers,
    loadVisualizers,
    observeVisualizersByProviderId,
} from './visualizerProviders';
import visualizerSettings, {observeVisualizerProvider} from './visualizerSettings';
import visualizerStore from './visualizerStore';

const logger = new Logger('visualizer');

type NextVisualizerReason =
    | 'new-media-item'
    | 'new-provider'
    | 'new-visualizers'
    | 'next-clicked'
    | 'error';

interface ErrorRecord {
    providerId: VisualizerProviderId;
    count: number;
}

const errorRecord: ErrorRecord = {
    providerId: 'none',
    count: 0,
};

export const noVisualizer: NoVisualizer = {
    providerId: 'none',
    name: '',
    link: {providerId: 'none', name: ''},
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(noVisualizer);
const nextVisualizerReason$ = new Subject<NextVisualizerReason>();

export function observeCurrentVisualizer(): Observable<Visualizer> {
    return currentVisualizer$.pipe(
        distinctUntilChanged(
            (a: any, b: any) =>
                a.providerId === b.providerId && a.name === b.name && a.reason === b.reason
        )
    );
}

export function getCurrentVisualizer(): Visualizer {
    return currentVisualizer$.value;
}

export function setCurrentVisualizer({
    providerId,
    name,
}: Pick<Visualizer, 'providerId' | 'name'>): void {
    currentVisualizer$.next(
        getVisualizer(providerId, name) || createNoVisualizer('not loaded', providerId, name)
    );
}

export function isProviderSupported(providerId: string, item: MediaItem): boolean {
    const isDev = location.hostname === 'localhost' && !browser.isElectron;
    const [serviceId] = item.src.split(':');
    const ambientVideoSupported = !/^(spotify)$/.test(serviceId) || isDev;

    switch (providerId) {
        case 'spotifyviz':
            return serviceId === 'spotify';

        case 'ambientvideo':
            return ambientVideoSupported;

        default:
            // For Safari.
            // If the Web Audio API is not supported for streaming media then we can't use a visualizer.
            return (
                audio.streamingSupported ||
                (item.playbackType !== PlaybackType.DASH && item.playbackType !== PlaybackType.HLS)
            );
    }
}

export function isVisualizerLoaded({providerId, name}: Visualizer | VisualizerFavorite): boolean {
    return !!getVisualizer(providerId, name);
}

export function isVisualizerSupported(
    visualizer: Visualizer | VisualizerFavorite,
    item: MediaItem
): boolean {
    return (
        isProviderSupported(visualizer.providerId, item) && !isVisualizerExcluded(visualizer, item)
    );
}

export function nextVisualizer(reason: NextVisualizerReason): void {
    nextVisualizerReason$.next(reason);
}

export function lockVisualizer(): void {
    visualizerSettings.lockedVisualizer = getCurrentVisualizer();
}

export function unlockVisualizer(): void {
    visualizerSettings.lockedVisualizer = null;
}

export function observeNextVisualizerReason(): Observable<NextVisualizerReason> {
    return nextVisualizerReason$;
}

function getNextVisualizer(reason: NextVisualizerReason): Visualizer {
    const currentVisualizer = getCurrentVisualizer();
    const state = playback.getPlaybackState();
    const settings = visualizerSettings;
    const item = state.currentItem;

    if (state.miniPlayer && !isMiniPlayer) {
        return currentVisualizer;
    }

    if (!item || item.mediaType === MediaType.Video) {
        return noVisualizer;
    }

    const [serviceId] = item.src.split(':');
    const isSpotify = serviceId === 'spotify';
    const isError = reason === 'error';

    const lockedVisualizer = settings.lockedVisualizer;
    if (lockedVisualizer) {
        const {providerId, name} = lockedVisualizer;
        if (isError) {
            return createNoVisualizer('error', providerId, name);
        } else if (isVisualizerSupported(lockedVisualizer, item)) {
            return getOrCreateVisualizer(providerId, name);
        } else {
            return createNoVisualizer('not supported', providerId, name);
        }
    }

    let providerId: VisualizerProviderId = 'none';

    switch (settings.provider) {
        case 'none':
            return noVisualizer;

        case 'favorites': {
            const favorites = visualizerStore.getFavorites();
            if (favorites.length === 0) {
                return noVisualizer;
            }
            const currentFavorite = favorites.find(
                (favorite) =>
                    favorite.providerId === currentVisualizer.providerId &&
                    favorite.name === currentVisualizer.name
            );
            const supportedFavorites = favorites.filter((favorite) =>
                isVisualizerSupported(favorite, item)
            );
            if (supportedFavorites.length === 0) {
                return createNoVisualizerFromList(
                    'not supported',
                    reason,
                    favorites,
                    currentFavorite
                );
            }
            const loadedFavorites = favorites.filter((favorite) => isVisualizerLoaded(favorite));
            if (loadedFavorites.length === 0) {
                return createNoVisualizerFromList(
                    'not loaded',
                    reason,
                    supportedFavorites,
                    currentFavorite
                );
            }
            const {providerId, name} = pickNextVisualizer(reason, loadedFavorites, currentFavorite);
            return getOrCreateVisualizer(providerId, name);
        }

        case 'random': {
            const providerIds = getRandomProviderIds(isSpotify);
            if (providerIds.length === 0) {
                return noVisualizer;
            }
            providerId = getRandomValue(
                providerIds,
                isError ? currentVisualizer.providerId : undefined
            );
            if (
                reason === 'next-clicked' &&
                providerId === currentVisualizer.providerId &&
                getVisualizers(providerId).length === 1
            ) {
                providerId = getRandomValue(providerIds, providerId);
            }
            break;
        }

        default:
            providerId = settings.provider;
    }

    const visualizers = getVisualizers(providerId);
    if (visualizers.length === 0) {
        return createNoVisualizer('not loaded', providerId);
    }
    const supportedVisualizers = visualizers.filter((visualizer) =>
        isVisualizerSupported(visualizer, item)
    );
    if (supportedVisualizers.length === 0) {
        return createNoVisualizerFromList('not supported', reason, visualizers, currentVisualizer);
    }
    return pickNextVisualizer(reason, supportedVisualizers, currentVisualizer) || noVisualizer;
}

function pickNextVisualizer<T extends Visualizer | VisualizerFavorite>(
    reason: NextVisualizerReason,
    visualizers: readonly T[],
    currentVisualizer: T | undefined
): T {
    if (visualizers.length === 1) {
        return visualizers[0];
    }
    if (reason === 'next-clicked' && visualizerSettings.provider !== 'random') {
        const index = visualizers.findIndex((visualizer) => visualizer === currentVisualizer);
        if (index === visualizers.length - 1) {
            return visualizers[0];
        } else {
            return visualizers[index + 1];
        }
    } else {
        return getRandomValue(visualizers, currentVisualizer);
    }
}

function createNoVisualizer(
    reason: NoVisualizer['name'],
    providerId: VisualizerProviderId,
    name?: string
): NoVisualizer {
    return {providerId: 'none', name: reason, link: {providerId, name}};
}

function createNoVisualizerFromList<T extends Visualizer | VisualizerFavorite>(
    noVisualizerReason: NoVisualizer['name'],
    nextReason: NextVisualizerReason,
    visualizers: readonly T[],
    currentVisualizer: T | undefined
): NoVisualizer {
    const {providerId, name} = pickNextVisualizer(nextReason, visualizers, currentVisualizer);
    return createNoVisualizer(noVisualizerReason, providerId, name);
}

function getOrCreateVisualizer(providerId: VisualizerProviderId, name: string): Visualizer {
    let visualizer = getVisualizer(providerId, name);
    if (!visualizer) {
        if (providerId === 'ambientvideo' && youtubeApi.isVideoId(name)) {
            visualizer = youtubeApi.createAmbientVideo(name);
        } else {
            visualizer = createNoVisualizer('not loaded', providerId, name);
        }
    }
    return visualizer;
}

function getRandomProviderIds(isSpotify: boolean): readonly VisualizerProviderId[] {
    const randomness = isSpotify
        ? visualizerSettings.spotifyRandomness
        : visualizerSettings.randomness;
    const providerIds = Object.keys(randomness) as VisualizerProviderId[];
    return providerIds.map((id) => Array(randomness[id]).fill(id)).flat();
}

function isVisualizerExcluded(
    visualizer: Visualizer | VisualizerFavorite,
    item: MediaItem
): boolean {
    const [serviceId] = item.src.split(':');
    return serviceId === 'spotify' && !!visualizer.spotifyExcluded;
}

observeCurrentItem()
    .pipe(
        filter(exists),
        take(1),
        tap(() => loadVisualizers())
    )
    .subscribe(logger);

observeCurrentItem()
    .pipe(
        skipWhile((item) => !item),
        distinctUntilChanged((a, b) => a?.id === b?.id),
        tap(() => nextVisualizer('new-media-item'))
    )
    .subscribe(logger);

observeVisualizerProvider()
    .pipe(
        tap(() => nextVisualizer('new-provider')),
        switchMap((provider) =>
            provider === 'random' || provider === 'favorites'
                ? observeCurrentVisualizer().pipe(
                      switchMap((visualizer) =>
                          visualizer.providerId === 'none' && visualizer.name === 'not loaded'
                              ? observeVisualizersByProviderId(visualizer.link.providerId).pipe(
                                    skipWhile((visualizers) => visualizers.length === 0),
                                    take(1)
                                )
                              : EMPTY
                      )
                  )
                : observeVisualizersByProviderId(provider).pipe(skip(1))
        ),
        distinctUntilChanged(),
        tap(() => nextVisualizer('new-visualizers'))
    )
    .subscribe(logger);

observeNextVisualizerReason()
    .pipe(
        delay(16), // Allow interstitial static to appear
        withLatestFrom(observeCurrentVisualizer()),
        tap(([reason, {providerId}]) => {
            if (reason === 'error') {
                if (errorRecord.providerId === providerId) {
                    errorRecord.count++;
                } else {
                    errorRecord.providerId = providerId;
                    errorRecord.count = 1;
                }
            } else {
                errorRecord.providerId = providerId;
                errorRecord.count = 0;
            }
        }),
        map(([reason]) => getNextVisualizer(reason)),
        map((visualizer) => {
            // Prevent further errors.
            if (errorRecord.providerId === visualizer.providerId && errorRecord.count >= 3) {
                errorRecord.providerId = 'none';
                errorRecord.count = 0;
                return createNoVisualizer('error', visualizer.providerId, visualizer.name);
            }
            return visualizer;
        }),
        tap((visualizer) => currentVisualizer$.next(visualizer))
    )
    .subscribe(logger);
