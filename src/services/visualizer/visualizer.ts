import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    distinctUntilChanged,
    filter,
    map,
    of,
    skip,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import Visualizer, {NoVisualizer} from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import audio from 'services/audio';
import playback, {observeCurrentItem} from 'services/mediaPlayback/playback';
import {exists, getRandomValue, isMiniPlayer, Logger} from 'utils';
import {
    getVisualizerProvider,
    loadVisualizers,
    observeVisualizerProviders,
} from './visualizerProviders';
import visualizerSettings, {observeVisualizerProviderId} from './visualizerSettings';

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
    ...Array(58).fill('ampshader'), // most of the time use this one
    ...Array(10).fill('butterchurn'),
    ...Array(10).fill('spotifyviz'),
    ...Array(2).fill('coverart'),
];

const randomVideo: VisualizerProviderId[] = Array(10).fill('ambientvideo');
const spotifyRandomVideo: VisualizerProviderId[] = Array(20).fill('ambientvideo');

export function observeCurrentVisualizer(): Observable<Visualizer> {
    return currentVisualizer$.pipe(
        distinctUntilChanged(
            (a: any, b: any) =>
                a.providerId === b.providerId && a.name === b.name && a.reason === b.reason
        )
    );
}

export function observeCurrentVisualizers(): Observable<readonly Visualizer[]> {
    return observeVisualizerProviderId().pipe(
        switchMap((providerId) => observeVisualizersByProvider(providerId))
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

export function observeVisualizersByProvider(
    providerId: VisualizerProviderId | ''
): Observable<readonly Visualizer[]> {
    return observeVisualizerProviders().pipe(
        switchMap((providers) =>
            providers.length === 0
                ? of([])
                : of(getVisualizerProvider(providerId)).pipe(
                      switchMap((provider) => (provider ? provider.observeVisualizers() : of([])))
                  )
        )
    );
}

function observeNextVisualizerReason(): Observable<NextVisualizerReason> {
    return nextVisualizerReason$;
}

function getNextVisualizer(reason: NextVisualizerReason): Visualizer {
    const currentVisualizer = getCurrentVisualizer();
    const state = playback.getPlaybackState();

    if (state.miniPlayer && !isMiniPlayer) {
        return currentVisualizer;
    }

    const item = state.currentItem;

    if (!item || item.mediaType === MediaType.Video) {
        return noVisualizer;
    }

    const settings = visualizerSettings;

    // Keep track of *consecutive* errors.
    const isError = reason === 'error';
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

    const isSpotify = item.src.startsWith('spotify:');
    const lockedVisualizer = settings.lockedVisualizer;
    let providerId: VisualizerProviderId | '' = lockedVisualizer?.providerId || settings.provider;
    switch (providerId) {
        case 'spotifyviz':
            if (!isSpotify) {
                return createNoVisualizer(providerId, 'not supported');
            }
            break;

        case 'audiomotion':
            if (isSpotify) {
                return createNoVisualizer(providerId, 'not supported');
            }
            break;

        case 'none':
            return noVisualizer;
    }

    if (lockedVisualizer) {
        return isError
            ? createNoVisualizer(providerId, 'error')
            : getVisualizer(lockedVisualizer.providerId, lockedVisualizer.name) ||
                  createNoVisualizer(providerId, 'not loaded');
    }

    providerId = settings.provider;
    if (!providerId) {
        if (currentVisualizer.providerId === 'none' && currentVisualizer.reason === 'not loaded') {
            providerId = currentVisualizer.name as VisualizerProviderId;
        }
    }
    if (!providerId) {
        // Random provider.
        let providers = isSpotify ? spotifyRandomProviders : randomProviders;
        if (settings.ambientVideoEnabled) {
            providers = providers.concat(isSpotify ? spotifyRandomVideo : randomVideo);
        }
        providerId = getRandomValue(providers, isError ? currentVisualizer.providerId : undefined);
        if (
            reason === 'next-clicked' &&
            providerId === currentVisualizer.providerId &&
            getVisualizers(providerId).length === 1
        ) {
            providerId = getRandomValue(providers, providerId);
        }
    }

    // Fix for Safari.
    // If the Web Audio API is not supported for streaming media then we can't use a visualizer.
    if (
        providerId !== 'ambientvideo' &&
        !audio.streamingSupported &&
        (item.playbackType === PlaybackType.DASH || item.playbackType === PlaybackType.HLS)
    ) {
        return createNoVisualizer(providerId, 'not supported');
    }

    const visualizers = getVisualizers(providerId);

    if (visualizers.length === 0) {
        return createNoVisualizer(providerId, 'not loaded');
    }

    // Prevent further errors.
    if (isError) {
        if (
            (settings.provider && visualizers.length === 1) ||
            (errorRecord.providerId === providerId && errorRecord.count >= 3)
        ) {
            errorRecord.providerId = 'none';
            errorRecord.count = 0;
            return createNoVisualizer(providerId, 'error');
        }
    }

    return getRandomValue(visualizers, currentVisualizer) || noVisualizer;
}

function getVisualizer(providerId: string, name: string): Visualizer | undefined {
    return getVisualizers(providerId).find((visualizer) => visualizer.name === name);
}

function getVisualizers(providerId: string): readonly Visualizer[] {
    return getVisualizerProvider(providerId)?.visualizers || [];
}

function createNoVisualizer(
    providerId: VisualizerProviderId | '',
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

observeVisualizerProviderId()
    .pipe(
        tap(() => nextVisualizer('new-provider')),
        switchMap((providerId) =>
            providerId
                ? observeVisualizersByProvider(providerId).pipe(skip(1))
                : observeCurrentVisualizer().pipe(
                      switchMap((visualizer) =>
                          visualizer.providerId === 'none' && visualizer.reason === 'not loaded'
                              ? observeVisualizersByProvider(
                                    visualizer.name as VisualizerProviderId
                                ).pipe(
                                    skipWhile((visualizers) => visualizers.length === 0),
                                    take(3)
                                )
                              : EMPTY
                      )
                  )
        ),
        tap(() => nextVisualizer('new-visualizers'))
    )
    .subscribe(logger);

observeNextVisualizerReason()
    .pipe(
        map((reason) => getNextVisualizer(reason)),
        tap((visualizer) => currentVisualizer$.next(visualizer))
    )
    .subscribe(logger);
