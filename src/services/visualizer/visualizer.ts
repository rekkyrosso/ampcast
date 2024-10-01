import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    distinctUntilChanged,
    filter,
    map,
    skip,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs';
import MediaServiceId from 'types/MediaServiceId';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import Visualizer, {NoVisualizer} from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import audio from 'services/audio';
import playback, {observeCurrentItem} from 'services/mediaPlayback/playback';
import youtubeApi from 'services/youtube/youtubeApi';
import {browser, exists, filterNotEmpty, getRandomValue, isMiniPlayer, Logger} from 'utils';
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
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(noVisualizer);
const nextVisualizerReason$ = new Subject<NextVisualizerReason>();

const randomProviders: VisualizerProviderId[] = [
    ...Array(74).fill('butterchurn'), // most of the time use this one
    ...Array(10).fill('ampshader'),
    ...Array(4).fill('audiomotion'),
    ...Array(1).fill('coverart'),
    ...Array(1).fill('waveform'),
];

const spotifyRandomProviders: VisualizerProviderId[] = [
    ...Array(60).fill('ampshader'), // most of the time use this one
    ...Array(9).fill('audiomotion'),
    ...Array(6).fill('spotifyviz'),
    ...Array(4).fill('butterchurn'),
    ...Array(1).fill('coverart'),
];

const randomVideo: VisualizerProviderId[] = Array(10).fill('ambientvideo');

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
        getVisualizer(providerId, name) || createNoVisualizer(providerId, 'not loaded')
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

    const isDev = location.hostname === 'localhost' && !browser.isElectron;
    const [serviceId]: [MediaServiceId] = item.src.split(':') as [MediaServiceId];
    const ambientVideoSupported = !/^(spotify)$/.test(serviceId) || isDev;
    const isError = reason === 'error';
    const isSpotify = serviceId === 'spotify';

    const isProviderSupported = (providerId: VisualizerProviderId): boolean => {
        switch (providerId) {
            case 'spotifyviz':
                return isSpotify;

            case 'ambientvideo':
                return ambientVideoSupported;

            default:
                // For Safari.
                // If the Web Audio API is not supported for streaming media then we can't use a visualizer.
                return (
                    audio.streamingSupported ||
                    (item.playbackType !== PlaybackType.DASH &&
                        item.playbackType !== PlaybackType.HLS)
                );
        }
    };

    // Keep track of *consecutive* errors.
    if (isError) {
        if (errorRecord.providerId === currentVisualizer.providerId) {
            errorRecord.count++;
        } else {
            errorRecord.providerId = currentVisualizer.providerId;
            errorRecord.count = 1;
        }
    } else {
        errorRecord.providerId = currentVisualizer.providerId;
        errorRecord.count = 0;
    }

    if (settings.lockedVisualizer) {
        const {providerId, name} = settings.lockedVisualizer;
        if (isError) {
            return createNoVisualizer(providerId, 'error');
        } else if (isProviderSupported(providerId)) {
            return getOrCreateVisualizer(providerId, name);
        } else {
            return createNoVisualizer(providerId, 'not supported');
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
            const supportedFavorites = favorites.filter(({providerId}) =>
                isProviderSupported(providerId)
            );
            if (supportedFavorites.length === 0) {
                const unsupported = getRandomValue(favorites);
                return createNoVisualizer(unsupported.providerId, 'not supported');
            } else {
                const {providerId, name} = getRandomValue(
                    filterNotEmpty(
                        supportedFavorites,
                        (favorite) =>
                            favorite.providerId !== currentVisualizer.providerId ||
                            favorite.name !== currentVisualizer.name
                    )
                );
                return getOrCreateVisualizer(providerId, name);
            }
        }

        case 'random': {
            let providerIds = isSpotify ? spotifyRandomProviders : randomProviders;
            if (ambientVideoSupported && settings.ambientVideoEnabled) {
                providerIds = providerIds.concat(randomVideo);
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

    if (!isProviderSupported(providerId)) {
        return createNoVisualizer(providerId, 'not supported');
    }

    const visualizers = getVisualizers(providerId);

    if (visualizers.length === 0) {
        return createNoVisualizer(providerId, 'not loaded');
    }

    return getRandomValue(visualizers, currentVisualizer) || noVisualizer;
}

function getOrCreateVisualizer(providerId: VisualizerProviderId, name: string): Visualizer {
    let visualizer = getVisualizer(providerId, name);
    if (!visualizer) {
        if (providerId === 'ambientvideo' && youtubeApi.isVideoId(name)) {
            visualizer = youtubeApi.createAmbientVideo(name);
        } else {
            visualizer = createNoVisualizer(providerId, 'not loaded');
        }
    }
    return visualizer;
}

function createNoVisualizer(
    providerId: VisualizerProviderId,
    reason: NoVisualizer['reason']
): NoVisualizer {
    return {providerId: 'none', name: providerId, reason};
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
                          visualizer.providerId === 'none' && visualizer.reason === 'not loaded'
                              ? observeVisualizersByProviderId(visualizer.name).pipe(
                                    skipWhile((visualizers) => visualizers.length === 0),
                                    take(1)
                                )
                              : EMPTY
                      )
                  )
                : observeVisualizersByProviderId(provider).pipe(skip(1))
        ),
        tap(() => nextVisualizer('new-visualizers'))
    )
    .subscribe(logger);

observeNextVisualizerReason()
    .pipe(
        map((reason) => getNextVisualizer(reason)),
        map((visualizer) => {
            // Prevent further errors.
            if (errorRecord.providerId === visualizer.providerId && errorRecord.count >= 3) {
                errorRecord.providerId = 'none';
                errorRecord.count = 0;
                return createNoVisualizer(visualizer.providerId, 'error');
            }
            return visualizer;
        }),
        tap((visualizer) => currentVisualizer$.next(visualizer))
    )
    .subscribe(logger);
