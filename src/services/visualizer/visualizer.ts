import type {Observable} from 'rxjs';
import {Subject, BehaviorSubject, merge, partition} from 'rxjs';
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
import VisualizerProvider from 'types/VisualizerProvider';
import {observeCurrentItem} from 'services/playlist';
import {observePaused} from 'services/mediaPlayback/playback';
import {exists, getRandomValue, Logger} from 'utils';
import ambientVideoPresets from './ambientVideoPresets';
import ampshaderPresets from './ampshaderPresets';
import audioMotionPresets from './audioMotionPresets';
import butterchurnPresets from './butterchurnPresets';
import spotifyVizPresets from './spotifyVizPresets';
import waveformPresets from './waveformPresets';
import player from './player';
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
    provider: 'none',
    name: '',
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(defaultVisualizer);
const next$ = new Subject<'next'>();
const empty$ = observeCurrentItem().pipe(filter((item) => item == null));
const media$ = observeCurrentItem().pipe(filter(exists));
const [audio$, video$] = partition(media$, (item) => item.mediaType === MediaType.Audio);
const [paused$, playing$] = partition(observePaused(), Boolean);

const randomProviders: VisualizerProvider[] = [
    ...Array(79).fill('milkdrop'), // most of the time use this one
    ...Array(10).fill('ambient-video'),
    ...Array(6).fill('audiomotion'),
    ...Array(4).fill('ampshader'),
    ...Array(1).fill('waveform'),
];

const randomSpotifyProviders: VisualizerProvider[] = [
    ...Array(59).fill('spotify-viz'), // most of the time use this one
    ...Array(20).fill('ambient-video'),
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

export function setProvider(provider: VisualizerProvider): void {
    visualizerSettings.provider = provider;
}

export default {
    observeCurrentVisualizer,
    observeLocked,
    observeProvider,
    observeSettings,
    nextVisualizer,
    lock,
    unlock,
    setProvider,
};

empty$.subscribe(() => player.stop());
audio$.subscribe(() => (player.hidden = false));
video$.subscribe(() => {
    player.pause();
    player.hidden = true;
});

paused$.subscribe(() => player.pause());

merge(audio$, next$, observeProvider(), player.observeError())
    .pipe(
        withLatestFrom(audio$, observeSettings()),
        map(([reason, item, settings]) => getNextVisualizer(item, settings, reason === 'next')),
        distinctUntilChanged()
    )
    .subscribe(currentVisualizer$);

observeCurrentVisualizer()
    .pipe(tap((visualizer) => player.load(visualizer)))
    .subscribe(logger);

audio$.pipe(switchMap(() => playing$)).subscribe(() => player.play());

logger.log('Ambient videos:', ambientVideoPresets.length);
logger.log('Ampshader presets:', ampshaderPresets.length);
logger.log('AudioMotion presets:', audioMotionPresets.length);

butterchurnPresets
    .observe()
    .pipe(
        skipWhile((presets) => presets.length === 0),
        withLatestFrom(observeCurrentVisualizer()),
        tap(([, currentVisualizer]) => {
            logger.log('Butterchurn presets:', butterchurnPresets.size);
            if (currentVisualizer === defaultVisualizer) {
                nextVisualizer();
            }
        }),
        take(2)
    )
    .subscribe(logger);

function getNextVisualizer(
    item: PlaylistItem,
    settings: VisualizerSettings,
    next?: boolean
): Visualizer {
    const lockedVisualizer = visualizerSettings.lockedVisualizer;
    if (lockedVisualizer) {
        return findVisualizer(lockedVisualizer.provider, lockedVisualizer.name);
    }
    const currentVisualizer = currentVisualizer$.getValue();
    let provider = settings.provider;
    if (!provider) {
        const isSpotify = item.src.startsWith('spotify:');
        const providers = isSpotify ? randomSpotifyProviders : randomProviders;
        provider = getRandomValue(providers);
        if (next && provider === currentVisualizer.provider && getPresets(provider).length === 1) {
            provider = getRandomValue(providers, provider);
        }
    }
    const presets = getPresets(provider);
    return getRandomValue(presets, currentVisualizer) || defaultVisualizer;
}

function findVisualizer(provider: VisualizerProvider, name: string): Visualizer {
    const presets = getPresets(provider);
    return presets.find((preset) => preset.name === name) || defaultVisualizer;
}

function getPresets(provider: VisualizerProvider): readonly Visualizer[] {
    switch (provider) {
        case 'ambient-video':
            return ambientVideoPresets;

        case 'ampshader':
            return ampshaderPresets;

        case 'audiomotion':
            return audioMotionPresets;

        case 'milkdrop':
            return butterchurnPresets.get();

        case 'spotify-viz':
            return spotifyVizPresets;

        case 'waveform':
            return waveformPresets;

        default:
            return [defaultVisualizer];
    }
}
