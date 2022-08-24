import type {Observable} from 'rxjs';
import {Subject, BehaviorSubject, merge, partition} from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map,
    switchMap,
    take,
    tap,
    withLatestFrom,
} from 'rxjs/operators';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import {observeCurrentItem, observePaused} from 'services/mediaPlayback';
import {exists, getRandomValue, LiteStorage, Logger} from 'utils';
import ampshaderPresets from './ampshaderPresets';
import audioMotionPresets from './audioMotionPresets';
import butterchurnPresets from './butterchurnPresets';
import videos from './videos';
import player from './player';

console.log('module::visualizer');

const logger = new Logger('visualizer');

const ampshaderPresetNames = ampshaderPresets.map((preset) => preset.name);
const audioMotionPresetNames = audioMotionPresets.map((preset) => preset.name);

const storage = new LiteStorage('visualizer');

export interface VisualizerSettings {
    readonly provider?: VisualizerProvider;
    readonly locked?: Visualizer;
}

const defaultVisualizer: Visualizer = {
    provider: 'none',
    preset: '',
};

const currentVisualizer$ = new BehaviorSubject<Visualizer>(defaultVisualizer);
const settings$ = new BehaviorSubject<VisualizerSettings>({});
const next$ = new Subject<void>();
const empty$ = observeCurrentItem().pipe(filter((item) => item == null));
const media$ = observeCurrentItem().pipe(filter(exists));
const [audio$, video$] = partition(media$, (item) => item.mediaType === MediaType.Audio);
const [paused$, playing$] = partition(observePaused(), Boolean);

const randomProviders: VisualizerProvider[] = [
    ...Array(79).fill('milkdrop'), // most of the time use this one
    ...Array(10).fill('video'),
    ...Array(5).fill('ampshader'),
    ...Array(5).fill('audiomotion'),
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
    next$.next(undefined);
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
        storage.setItem('settings', JSON.stringify(newSettings));
        settings$.next(newSettings);
    }
}

export function setProvider(provider: VisualizerProvider | ''): void {
    const {provider: prevProvider, ...settings} = settings$.getValue();
    if (provider !== prevProvider) {
        const newSettings = provider ? {...settings, provider} : settings;
        storage.setItem('settings', JSON.stringify(newSettings));
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

(() => {
    try {
        const settings = storage.getItem('settings') || '{}';
        settings$.next(JSON.parse(settings));
    } catch (err) {
        logger.error(err);
    }
})();

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
        map(([, item, settings]) => getNextVisualizer(item, settings)),
        distinctUntilChanged()
    )
    .subscribe(currentVisualizer$);

observeCurrentVisualizer()
    .pipe(tap((visualizer) => player.load(visualizer)))
    .subscribe(logger);

audio$.pipe(switchMap(() => playing$)).subscribe(() => player.play());

logger.log('Ambient videos:', videos.length);
logger.log('Ampshader presets:', ampshaderPresets.length);
logger.log('AudioMotion presets:', audioMotionPresets.length);

butterchurnPresets
    .observe()
    .pipe(
        withLatestFrom(observeCurrentVisualizer()),
        tap(([, currentVisualizer]) => {
            if (currentVisualizer === defaultVisualizer) {
                nextVisualizer();
            }
            logger.log('Butterchurn presets:', butterchurnPresets.size);
        }),
        take(3)
    )
    .subscribe(logger);

function getNextVisualizer(item: PlaylistItem, settings: VisualizerSettings): Visualizer {
    const locked = settings.locked;
    if (locked) {
        if (locked.provider === 'milkdrop' && !butterchurnPresets.find(locked.preset)) {
            return defaultVisualizer;
        }
        return locked;
    }
    let provider = settings.provider;
    let preset = '';
    if (item.src.startsWith('spotify:')) {
        if (provider !== 'video') {
            provider = 'spotify-viz';
        }
    } else if (provider === 'spotify-viz') {
        provider = 'milkdrop';
    }
    if (!provider) {
        provider = getRandomValue(randomProviders);
    }
    const currentVisualizer = currentVisualizer$.getValue();
    const currentPreset = currentVisualizer.preset;
    switch (provider) {
        case 'ampshader':
            preset = getRandomValue(ampshaderPresetNames, currentPreset);
            break;

        case 'audiomotion':
            preset = getRandomValue(audioMotionPresetNames, currentPreset);
            break;

        case 'milkdrop':
            preset = getRandomValue(butterchurnPresets.getNames(), currentPreset);
            if (!preset) {
                return defaultVisualizer;
            }
            break;

        case 'video':
            preset = getRandomValue(videos, currentPreset);
            break;
    }
    return {provider, preset};
}
