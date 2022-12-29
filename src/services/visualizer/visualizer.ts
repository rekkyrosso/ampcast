import type {Observable} from 'rxjs';
import {Subject, BehaviorSubject, of, partition} from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    skipWhile,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from 'rxjs/operators';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Visualizer, {NoVisualizer} from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {observeCurrentItem} from 'services/playlist';
import {observePaused} from 'services/mediaPlayback/playback';
import {exists, getRandomValue, Logger} from 'utils';
import {getVisualizerProvider, getVisualizer, getVisualizers} from './visualizerProviders';
import visualizerPlayer from './visualizerPlayer';
import visualizerSettings, {
    observeVisualizerSettings,
    VisualizerSettings,
} from './visualizerSettings';
import VisualizerProvider from 'types/VisualizerProvider';
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
const empty$ = observeCurrentItem().pipe(filter((item) => item == null));
const media$ = observeCurrentItem().pipe(filter(exists));
const [audio$, video$] = partition(media$, (item) => item.mediaType === MediaType.Audio);
const [paused$, playing$] = partition(observePaused(), Boolean);

const randomProviders: VisualizerProviderId[] = [
    ...Array(79).fill('milkdrop'), // most of the time use this one
    ...Array(6).fill('audiomotion'),
    ...Array(4).fill('ampshader'),
    ...Array(1).fill('waveform'),
];

const spotifyRandomProviders: VisualizerProviderId[] = [
    ...Array(59).fill('spotifyviz'), // most of the time use this one
    ...Array(20).fill('ampshader'),
    ...Array(1).fill('waveform'),
];

const randomVideo: VisualizerProviderId[] = Array(10).fill('ambientvideo');
const spotifyRandomVideo: VisualizerProviderId[] = randomVideo.concat(randomVideo);

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
    return next$;
}

export function lock(): void {
    visualizerSettings.lockedVisualizer = currentVisualizer$.getValue();
}

export function unlock(): void {
    visualizerSettings.lockedVisualizer = null;
}

empty$.subscribe(() => visualizerPlayer.stop());
audio$.subscribe(() => (visualizerPlayer.hidden = false));
video$.subscribe(() => {
    visualizerPlayer.pause();
    visualizerPlayer.hidden = true;
});

paused$.subscribe(() => visualizerPlayer.pause());

audio$.pipe(debounceTime(200)).subscribe(() => nextVisualizer('item'));
visualizerPlayer.observeError().subscribe(() => nextVisualizer('error'));
observeCurrentVisualizers().subscribe(() => nextVisualizer('provider'));

observeNextVisualizerReason()
    .pipe(
        withLatestFrom(audio$, observeVisualizerSettings()),
        map(([reason, item, settings]) => getNextVisualizer(item, settings, reason)),
        distinctUntilChanged()
    )
    .subscribe(currentVisualizer$);

observeCurrentVisualizer()
    .pipe(tap((visualizer) => visualizerPlayer.load(visualizer)))
    .subscribe(logger);

audio$.pipe(switchMap(() => playing$)).subscribe(() => visualizerPlayer.play());

getVisualizerProvider('milkdrop')
    ?.observeVisualizers()
    .pipe(
        skipWhile((visualizers) => visualizers.length === 0),
        withLatestFrom(observeCurrentVisualizer()),
        tap(([, currentVisualizer]) => {
            if (currentVisualizer === noVisualizer) {
                nextVisualizer('sync');
            }
        }),
        take(2)
    )
    .subscribe(logger);

function getNextVisualizer(
    item: PlaylistItem,
    settings: VisualizerSettings,
    reason: NextReason
): Visualizer {
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
        case 'milkdrop':
            if (isSpotify) {
                return noVisualizer;
            }
            break;

        case 'none':
            return noVisualizer;
    }
    if (lockedVisualizer) {
        return getVisualizer(lockedVisualizer.providerId, lockedVisualizer.name) || noVisualizer;
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
    return getRandomValue(visualizers, currentVisualizer) || noVisualizer;
}
