import type {Observable} from 'rxjs';
import {
    Subject,
    BehaviorSubject,
    debounce,
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    of,
    skipWhile,
    switchMap,
    take,
    tap,
    timer,
    withLatestFrom,
} from 'rxjs';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import Visualizer, {NoVisualizer} from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import audio from 'services/audio';
import {observeCurrentItem} from 'services/playlist';
import {exists, getRandomValue, Logger} from 'utils';
import {getVisualizerProvider, observeVisualizerProviders} from './visualizerProviders';
import visualizerSettings, {
    observeVisualizerSettings,
    VisualizerSettings,
} from './visualizerSettings';

const logger = new Logger('visualizer');

type NextVisualizerReason = 'click' | 'item' | 'provider' | 'sync' | 'error';

const noVisualizer: NoVisualizer = {
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
    return currentVisualizer$;
}

export function observeCurrentVisualizers(): Observable<readonly Visualizer[]> {
    return observeVisualizerProviders().pipe(
        switchMap((providers) =>
            providers.length === 0
                ? of([])
                : observeProviderId().pipe(
                      map((id) => getVisualizerProvider(id)),
                      switchMap((provider) => (provider ? provider.observeVisualizers() : of([])))
                  )
        )
    );
}

export function observeLocked(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => !!settings.lockedVisualizer),
        distinctUntilChanged()
    );
}

export function observeProviderId(): Observable<VisualizerProviderId | ''> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.provider || ''),
        distinctUntilChanged()
    );
}

export function nextVisualizer(reason: NextVisualizerReason): void {
    nextVisualizerReason$.next(reason);
}

export function observeNextVisualizerReason(): Observable<NextVisualizerReason> {
    // Give the UI time to update after clicks.
    return nextVisualizerReason$.pipe(
        debounce((reason) => (reason === 'click' ? timer(50) : of(undefined)))
    );
}

export function lock(): void {
    visualizerSettings.lockedVisualizer = getCurrentVisualizer();
}

export function unlock(): void {
    visualizerSettings.lockedVisualizer = null;
}

observeVisualizerProviders()
    .pipe(
        skipWhile((providers) => providers.length === 0),
        switchMap(() => observeCurrentItem()),
        distinctUntilChanged((a, b) => a?.id === b?.id),
        debounceTime(200)
    )
    .subscribe(() => nextVisualizer('item'));

observeCurrentVisualizers().subscribe(() => nextVisualizer('provider'));

observeNextVisualizerReason()
    .pipe(
        withLatestFrom(observeCurrentItem(), observeVisualizerSettings()),
        map(([reason, item, settings]) => getNextVisualizer(reason, item, settings))
    )
    .subscribe(currentVisualizer$);

function getVisualizers(providerId: string): readonly Visualizer[] {
    return getVisualizerProvider(providerId)?.visualizers || [];
}

function getVisualizer(providerId: string, name: string): Visualizer | undefined {
    return getVisualizers(providerId).find((visualizer) => visualizer.name === name);
}

function getCurrentVisualizer(): Visualizer {
    return currentVisualizer$.getValue();
}

function getNextVisualizer(
    reason: NextVisualizerReason,
    item: PlaylistItem | null,
    settings: VisualizerSettings
): Visualizer {
    if (!item || item.mediaType === MediaType.Video) {
        return noVisualizer;
    }
    const isError = reason === 'error';
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
    const currentVisualizer = getCurrentVisualizer();
    providerId = settings.provider;
    if (!providerId) {
        // Random provider.
        let providers = isSpotify ? spotifyRandomProviders : randomProviders;
        if (settings.ambientVideoEnabled) {
            providers = providers.concat(isSpotify ? spotifyRandomVideo : randomVideo);
        }
        providerId = getRandomValue(providers, isError ? currentVisualizer.providerId : undefined);
        if (
            reason === 'click' &&
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
    if (isError && settings.provider && visualizers.length === 1) {
        // Prevent further errors.
        return createNoVisualizer(providerId, 'error');
    }
    return getRandomValue(visualizers, currentVisualizer) || noVisualizer;
}

function createNoVisualizer(
    providerId: VisualizerProviderId | '',
    reason: NoVisualizer['reason']
): NoVisualizer {
    const visualizer = getVisualizerProvider(providerId);
    const name = visualizer?.name || providerId;
    return {providerId: 'none', name, reason};
}

// If the user has locked a visualizer then make sure it loads once it's available.
function handleLazyLoads(providerId: VisualizerProviderId, loadCount = 1) {
    observeVisualizerProviders()
        .pipe(
            map(() => getVisualizerProvider(providerId)),
            filter(exists),
            mergeMap((provider) =>
                provider.observeVisualizers().pipe(
                    skipWhile((visualizers) => visualizers.length === 0),
                    withLatestFrom(observeCurrentVisualizer()),
                    tap(([, currentVisualizer]) => {
                        if (
                            currentVisualizer.providerId === 'none' &&
                            currentVisualizer.name === providerId &&
                            currentVisualizer.reason === 'not loaded'
                        ) {
                            nextVisualizer('sync');
                        }
                    }),
                    take(loadCount)
                )
            )
        )
        .subscribe(logger);
}

handleLazyLoads('ampshader');
handleLazyLoads('butterchurn', 2);
