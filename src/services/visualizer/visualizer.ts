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
import PlaylistItem from 'types/PlaylistItem';
import Visualizer, {NoVisualizer} from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {observeCurrentItem} from 'services/playlist';
import {getRandomValue, Logger} from 'utils';
import {getVisualizerProvider, getVisualizer, getVisualizers} from './visualizerProviders';
import visualizerPlayer from './visualizerPlayer';
import visualizerSettings, {
    observeVisualizerSettings,
    VisualizerSettings,
} from './visualizerSettings';
export {observeVisualizerSettings} from './visualizerSettings';

console.log('module::visualizer');

const logger = new Logger('visualizer');

type NextReason = 'click' | 'item' | 'provider' | 'sync' | 'error';

const noVisualizer: NoVisualizer = {
    providerId: 'none',
    name: '',
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(noVisualizer);
const next$ = new Subject<NextReason>();

const randomProviders: VisualizerProviderId[] = [
    ...Array(75).fill('butterchurn'), // most of the time use this one
    ...Array(10).fill('ampshader'),
    ...Array(4).fill('audiomotion'),
    ...Array(1).fill('waveform'),
];

const spotifyRandomProviders: VisualizerProviderId[] = [
    ...Array(70).fill('ampshader'), // most of the time use this one
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

export function nextVisualizer(reason: NextReason): void {
    next$.next(reason);
}

export function observeNextVisualizerReason(): Observable<NextReason> {
    // Give the UI time to update after clicks.
    return next$.pipe(debounce((reason) => (reason === 'click' ? timer(50) : of(undefined))));
}

export function lock(): void {
    visualizerSettings.lockedVisualizer = currentVisualizer$.getValue();
}

export function unlock(): void {
    visualizerSettings.lockedVisualizer = null;
}

observeCurrentItem()
    .pipe(debounceTime(200))
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

function getNextVisualizer(
    item: PlaylistItem | null,
    settings: VisualizerSettings,
    reason: NextReason
): Visualizer {
    if (!item || item.mediaType === MediaType.Video || item.duration < 30) {
        return noVisualizer;
    }
    const isError = reason === 'error';
    const isSpotify = item.src.startsWith('spotify:');
    const lockedVisualizer = settings.lockedVisualizer;
    let provider = lockedVisualizer?.providerId || settings.provider;
    switch (provider) {
        case 'spotifyviz':
            if (!isSpotify) {
                return noVisualizer;
            }
            break;

        case 'audiomotion':
        case 'butterchurn':
            if (isSpotify) {
                return noVisualizer;
            }
            break;

        case 'none':
            return noVisualizer;
    }
    if (lockedVisualizer) {
        return isError
            ? noVisualizer
            : getVisualizer(lockedVisualizer.providerId, lockedVisualizer.name) || noVisualizer;
    }
    const currentVisualizer = currentVisualizer$.getValue();
    provider = settings.provider;
    if (!provider) {
        // Random provider.
        let providers = isSpotify ? spotifyRandomProviders : randomProviders;
        if (settings.ambientVideoEnabled) {
            providers = providers.concat(isSpotify ? spotifyRandomVideo : randomVideo);
        }
        provider = getRandomValue(providers);
        if (
            reason === 'click' &&
            provider === currentVisualizer.providerId &&
            getVisualizers(provider).length === 1
        ) {
            provider = getRandomValue(providers, provider);
        }
    }
    const visualizers = getVisualizers(provider);
    if (isError && settings.provider && visualizers.length === 1) {
        return noVisualizer;
    }
    return getRandomValue(visualizers, currentVisualizer) || noVisualizer;
}

function handleLazyLoads(providerId: string, count = 1) {
    getVisualizerProvider(providerId)
        ?.observeVisualizers()
        .pipe(
            skipWhile((visualizers) => visualizers.length === 0),
            withLatestFrom(observeCurrentVisualizer()),
            tap(([visualizers, currentVisualizer]) => {
                console.log(`${providerId} visualizers:`, visualizers.length);
                if (currentVisualizer === noVisualizer) {
                    nextVisualizer('sync');
                }
            }),
            take(count)
        )
        .subscribe(logger);
}

handleLazyLoads('ampshader');
handleLazyLoads('butterchurn', 2);
