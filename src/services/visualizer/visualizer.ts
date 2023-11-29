import type {Observable} from 'rxjs';
import {
    Subject,
    BehaviorSubject,
    debounce,
    debounceTime,
    distinctUntilChanged,
    map,
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
import VisualizerProvider from 'types/VisualizerProvider';
import VisualizerProviderId from 'types/VisualizerProviderId';
import audio from 'services/audio';
import {observePlaybackReady} from 'services/mediaPlayback/playback';
import {observeCurrentItem} from 'services/playlist';
import {getRandomValue, Logger} from 'utils';
import {getVisualizerProvider, getVisualizer, getVisualizers} from './visualizerProviders';
import visualizerPlayer from './visualizerPlayer';
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
    ...Array(75).fill('butterchurn'), // most of the time use this one
    ...Array(10).fill('ampshader'),
    ...Array(4).fill('audiomotion'),
    ...Array(1).fill('waveform'),
];

const spotifyRandomProviders: VisualizerProviderId[] = [
    ...Array(60).fill('ampshader'), // most of the time use this one
    ...Array(10).fill('butterchurn'),
    ...Array(10).fill('spotifyviz'),
];

const randomVideo: VisualizerProviderId[] = Array(10).fill('ambientvideo');
const spotifyRandomVideo: VisualizerProviderId[] = Array(20).fill('ambientvideo');

export function observeCurrentVisualizer(): Observable<Visualizer> {
    return currentVisualizer$;
}

export function observeCurrentVisualizers(): Observable<readonly Visualizer[]> {
    return observeProviderId().pipe(
        map((id) => getVisualizerProvider(id)),
        switchMap((provider) => (provider ? provider.observeVisualizers() : of([])))
    );
}

export function observeLocked(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => !!settings.lockedVisualizer),
        distinctUntilChanged()
    );
}

export function observeProvider(): Observable<VisualizerProvider<Visualizer> | undefined> {
    return observeProviderId().pipe(
        map((id) => getVisualizerProvider(id)),
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

observePlaybackReady()
    .pipe(
        switchMap(() => observeCurrentItem()),
        debounceTime(200)
    )
    .subscribe(() => nextVisualizer('item'));
visualizerPlayer.observeError().subscribe(() => nextVisualizer('error'));
observeCurrentVisualizers().subscribe(() => nextVisualizer('provider'));

observeNextVisualizerReason()
    .pipe(
        withLatestFrom(observeCurrentItem(), observeVisualizerSettings()),
        map(([reason, item, settings]) => getNextVisualizer(item, settings, reason))
    )
    .subscribe(currentVisualizer$);

observeCurrentVisualizer()
    .pipe(tap((visualizer) => visualizerPlayer.load(visualizer)))
    .subscribe(logger);

function getCurrentVisualizer(): Visualizer {
    return currentVisualizer$.getValue();
}

function getNextVisualizer(
    item: PlaylistItem | null,
    settings: VisualizerSettings,
    reason: NextVisualizerReason
): Visualizer {
    if (!item || item.mediaType === MediaType.Video || item.duration < 30) {
        return noVisualizer;
    }
    const isError = reason === 'error';
    const isSpotify = item.src.startsWith('spotify:');
    const lockedVisualizer = settings.lockedVisualizer;
    let providerId = lockedVisualizer?.providerId || settings.provider;
    switch (providerId) {
        case 'spotifyviz':
            if (!isSpotify) {
                return noVisualizer; // unsupported
            }
            break;

        case 'audiomotion':
            if (isSpotify) {
                return noVisualizer; // unsupported
            }
            break;

        case 'none':
            return noVisualizer;
    }
    if (lockedVisualizer) {
        return isError
            ? noVisualizer // prevent further errors
            : getVisualizer(lockedVisualizer.providerId, lockedVisualizer.name) || noVisualizer;
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
    // If the Web Audio API is not supported for streaming media then
    // we can't use a visualizer.
    if (
        providerId !== 'ambientvideo' &&
        !audio.streamingSupported &&
        (item.playbackType === PlaybackType.DASH || item.playbackType === PlaybackType.HLS)
    ) {
        return noVisualizer; // unsupported
    }
    const visualizers = getVisualizers(providerId);
    if (isError && settings.provider && visualizers.length === 1) {
        // Prevent further errors.
        return noVisualizer;
    }
    return getRandomValue(visualizers, currentVisualizer) || noVisualizer;
}

// If the user has locked a visualizer then make sure it loads once it's available.
function handleLazyLoads(providerId: string, loadCount = 1) {
    getVisualizerProvider(providerId)
        ?.observeVisualizers()
        .pipe(
            skipWhile((visualizers) => visualizers.length === 0),
            withLatestFrom(observeCurrentVisualizer()),
            tap(([, currentVisualizer]) => {
                if (currentVisualizer === noVisualizer) {
                    nextVisualizer('sync');
                }
            }),
            take(loadCount)
        )
        .subscribe(logger);
}

handleLazyLoads('ampshader');
handleLazyLoads('butterchurn', 2);
