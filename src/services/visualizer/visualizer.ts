import type {Observable} from 'rxjs';
import {EMPTY, Subject, BehaviorSubject, merge, partition} from 'rxjs';
import {
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
import {getProvider, getVisualizer, getVisualizers} from './visualizerProviders';
import visualizerPlayer from './visualizerPlayer';
import visualizerSettings, {
    observeLocked,
    observeProvider,
    observeSettings,
    VisualizerSettings,
} from './visualizerSettings';
export {observeLocked, observeProvider, observeSettings} from './visualizerSettings';

console.log('module::visualizer');

const logger = new Logger('visualizer');

const defaultVisualizer: NoVisualizer = {
    providerId: 'none',
    name: '',
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(defaultVisualizer);
const next$ = new Subject<'next'>();
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

const randomVideo: VisualizerProviderId[] = Array(10).fill('ambientvideo');
const spotifyRandomVideo: VisualizerProviderId[] = randomVideo.concat(randomVideo);

const spotifyRandomProviders: VisualizerProviderId[] = [
    ...Array(59).fill('spotifyviz'), // most of the time use this one
    ...Array(20).fill('ampshader'),
    ...Array(1).fill('waveform'),
];

export function observeCurrentVisualizer(): Observable<Visualizer> {
    return currentVisualizer$;
}

export function nextVisualizer(): void {
    next$.next('next');
}

export function lock(): void {
    visualizerSettings.lockedVisualizer = currentVisualizer$.getValue();
}

export function unlock(): void {
    visualizerSettings.lockedVisualizer = undefined;
}

export default {
    observeCurrentVisualizer,
    observeLocked,
    observeProvider,
    observeSettings,
    nextVisualizer,
    lock,
    unlock,
};

empty$.subscribe(() => visualizerPlayer.stop());
audio$.subscribe(() => (visualizerPlayer.hidden = false));
video$.subscribe(() => {
    visualizerPlayer.pause();
    visualizerPlayer.hidden = true;
});

paused$.subscribe(() => visualizerPlayer.pause());

merge(
    audio$,
    next$,
    observeProvider().pipe(
        withLatestFrom(observeCurrentVisualizer()),
        filter(([provider, visualizer]) => !!provider && provider !== visualizer.providerId)
    ),
    visualizerPlayer.observeError()
)
    .pipe(
        withLatestFrom(audio$, observeSettings()),
        tap(logger.rx('getNextVisualizer')),
        map(([reason, item, settings]) => getNextVisualizer(item, settings, reason === 'next')),
        distinctUntilChanged()
    )
    .subscribe(currentVisualizer$);

observeCurrentVisualizer()
    .pipe(tap((visualizer) => visualizerPlayer.load(visualizer)))
    .subscribe(logger);

audio$.pipe(switchMap(() => playing$)).subscribe(() => visualizerPlayer.play());

observeProvider()
    .pipe(
        map((id) => getProvider(id)),
        switchMap((provider) =>
            provider
                ? provider.observeVisualizers().pipe(
                      skipWhile((presets) => presets.length === 0),
                      withLatestFrom(observeCurrentVisualizer()),
                      tap(([, currentVisualizer]) => {
                          if (currentVisualizer === defaultVisualizer) {
                              nextVisualizer();
                          }
                      }),
                      take(provider.id === 'milkdrop' ? 2 : 1)
                  )
                : EMPTY
        )
    )
    .subscribe(logger);

function getNextVisualizer(
    item: PlaylistItem,
    settings: VisualizerSettings,
    next?: boolean
): Visualizer {
    const lockedVisualizer = settings.lockedVisualizer;
    if (lockedVisualizer) {
        return getVisualizer(lockedVisualizer.providerId, lockedVisualizer.name) || defaultVisualizer;
    }
    const currentVisualizer = currentVisualizer$.getValue();
    let provider = settings.provider;
    if (!provider) {
        // Random provider.
        const isSpotify = item.src.startsWith('spotify:');
        let providers = isSpotify ? spotifyRandomProviders : randomProviders;
        if (settings.ambientVideoEnabled) {
            providers = providers.concat(isSpotify ? spotifyRandomVideo : randomVideo);
        }
        provider = getRandomValue(providers);
        if (
            next &&
            provider === currentVisualizer.providerId &&
            getVisualizers(provider).length === 1
        ) {
            provider = getRandomValue(providers, provider);
        }
    }
    const presets = getVisualizers(provider);
    return getRandomValue(presets, currentVisualizer) || defaultVisualizer;
}
