import type {Observable} from 'rxjs';
import {Subject, BehaviorSubject, merge, partition} from 'rxjs';
import {distinctUntilChanged, filter, map, switchMap, tap, withLatestFrom} from 'rxjs/operators';
import {get as dbRead, set as dbWrite, createStore} from 'idb-keyval';
import MediaType from 'types/MediaType';
import PlaylistItem from 'types/PlaylistItem';
import Visualizer from 'types/Visualizer';
import VisualizerProvider from 'types/VisualizerProvider';
import {observeCurrentItem, observePaused} from 'services/mediaPlayback';
import {exists, getRandomValue, Logger} from 'utils';
import audioMotionPresets from './audioMotionPresets';
import butterchurnPresets from './butterchurnPresets';
import videos from './videos';
import player from './player';

console.log('module::visualizer');

const logger = new Logger('visualizer');

logger.log('Ambient videos:', videos.length);
logger.log('AudioMotion presets:', audioMotionPresets.length);
logger.log('Butterchurn presets:', butterchurnPresets.length);

const audioMotionPresetNames = audioMotionPresets.map((preset) => preset.name);
const butterchurnPresetNames = butterchurnPresets.map((preset) => preset.name);

const store = createStore('ampcast/visualizer', 'keyval');

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
    ...Array(83).fill('milkdrop'), // most of the time use this one
    ...Array(10).fill('video'),
    ...Array(5).fill('audiomotion'),
    ...Array(1).fill('ampshade'),
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

export async function lock(): Promise<void> {
    return setLocked(true);
}

export async function unlock(): Promise<void> {
    return setLocked(false);
}

async function setLocked(locked: boolean): Promise<void> {
    const {locked: prevLocked, ...settings} = settings$.getValue();
    if (!!prevLocked !== locked) {
        const currentVisualizer = currentVisualizer$.getValue();
        const newSettings = locked ? {...settings, locked: currentVisualizer} : settings;
        await dbWrite('settings', newSettings, store);
        settings$.next(newSettings);
    }
}

export async function setProvider(provider: VisualizerProvider | ''): Promise<void> {
    const {provider: prevProvider, ...settings} = settings$.getValue();
    if (provider !== prevProvider) {
        const newSettings = provider ? {...settings, provider} : settings;
        await dbWrite('settings', newSettings, store);
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

(async () => {
    const settings = (await dbRead<VisualizerSettings>('settings', store)) ?? {};
    settings$.next(settings);
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

function getNextVisualizer(item: PlaylistItem, settings: VisualizerSettings): Visualizer {
    if (settings.locked) {
        return settings.locked; /// TODO: Rename this
    }
    let provider = settings.provider;
    let preset = '';
    if (item.src.startsWith('spotify:')) {
        provider = 'video';
    }
    if (!provider) {
        provider = getRandomValue(randomProviders);
    }
    const currentVisualizer = currentVisualizer$.getValue();
    const currentPreset = currentVisualizer.preset;
    switch (provider) {
        case 'audiomotion':
            preset = getRandomValue(audioMotionPresetNames, currentPreset);
            break;

        case 'milkdrop':
            preset = getRandomValue(butterchurnPresetNames, currentPreset);
            break;

        case 'video':
            preset = getRandomValue(videos, currentPreset);
            break;
    }
    return {provider, preset};
}
