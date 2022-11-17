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
import {observeCurrentItem, observePaused} from 'services/mediaPlayback';
import {exists, getRandomValue, LiteStorage, Logger} from 'utils';
import ambientVideoPresets from './ambientVideoPresets';
import ampshaderPresets from './ampshaderPresets';
import audioMotionPresets from './audioMotionPresets';
import butterchurnPresets from './butterchurnPresets';
import spotifyVizPresets from './spotifyVizPresets';
import waveformPresets from './waveformPresets';
import player from './player';

console.log('module::visualizer');

const logger = new Logger('visualizer');
const storage = new LiteStorage('visualizer');

export interface VisualizerSettings {
    readonly provider?: VisualizerProvider;
    readonly locked?: Pick<Visualizer, 'provider' | 'name'>;
}

const defaultVisualizer: NoVisualizer = {
    provider: 'none',
    name: '',
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(defaultVisualizer);
const settings$ = new BehaviorSubject<VisualizerSettings>({});
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

export function observeLocked(): Observable<boolean> {
    return observeSettings().pipe(map((settings) => !!settings.locked));
}

export function observeProvider(): Observable<VisualizerProvider | ''> {
    return observeSettings().pipe(
        map((settings) => settings.provider || ''),
        distinctUntilChanged()
    );
}

export function observeSettings(): Observable<VisualizerSettings> {
    return settings$;
}

export function nextVisualizer(): void {
    next$.next('next');
}

export function lock(): void {
    setLocked(true);
}

export function unlock(): void {
    setLocked(false);
}

function setLocked(locked: boolean): void {
    const {locked: prevLocked, ...prevSettings} = settings$.getValue();
    if (!!prevLocked !== locked) {
        const currentVisualizer = currentVisualizer$.getValue();
        const newSettings = locked ? {...prevSettings, locked: currentVisualizer} : prevSettings;
        storage.setJson('settings', newSettings);
        settings$.next(newSettings);
    }
}

export function setProvider(provider: VisualizerProvider | ''): void {
    const {provider: prevProvider, ...settings} = settings$.getValue();
    if (provider !== prevProvider) {
        const newSettings = provider ? {...settings, provider} : settings;
        storage.setJson('settings', newSettings);
        settings$.next(newSettings);
    }
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

settings$.next(storage.getJson('settings', {}));
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
            if (currentVisualizer === defaultVisualizer) {
                nextVisualizer();
            }
            logger.log('Butterchurn presets:', butterchurnPresets.size);
        }),
        take(2)
    )
    .subscribe(logger);

function getNextVisualizer(
    item: PlaylistItem,
    settings: VisualizerSettings,
    next?: boolean
): Visualizer {
    if (settings.locked) {
        return findVisualizer(settings.locked);
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

function findVisualizer({provider, name}: Pick<Visualizer, 'provider' | 'name'>): Visualizer {
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
