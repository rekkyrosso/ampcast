import {EMPTY, Observable, of} from 'rxjs';
import {Subject, BehaviorSubject, merge, partition} from 'rxjs';
import {
    catchError,
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
import Visualizer, {AmbientVideoVisualizer, NoVisualizer} from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {observeCurrentItem} from 'services/playlist';
import {observePaused} from 'services/mediaPlayback/playback';
import {getYouTubeSrc} from 'services/youtube';
import {loadPlaylist} from 'services/youtube/YouTubePlaylistLoader';
import {exists, getRandomValue, Logger} from 'utils';
import ambientVideoPresets from './ambientVideoPresets';
import ampshader from './ampshader';
import audioMotionPresets from './audioMotionPresets';
import butterchurnPresets from './butterchurnPresets';
import spotifyviz from './spotifyviz';
import waveformPresets from './Waveform/presets';
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

const ambientVideos$ = new BehaviorSubject<AmbientVideoVisualizer[]>(ambientVideoPresets);
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

function getAmbientVideos(): AmbientVideoVisualizer[] {
    return ambientVideos$.getValue();
}

export function lock(): void {
    visualizerSettings.lockedVisualizer = currentVisualizer$.getValue();
}

export function unlock(): void {
    visualizerSettings.lockedVisualizer = undefined;
}

export function setProvider(provider: VisualizerProviderId): void {
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

logger.log('Ambient videos:', ambientVideoPresets.length);
logger.log('Ampshader presets:', ampshader.visualizers.length);
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
    const lockedVisualizer = settings.lockedVisualizer;
    if (lockedVisualizer) {
        return findVisualizer(lockedVisualizer.providerId, lockedVisualizer.name);
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
        if (next && provider === currentVisualizer.providerId && getVisualizers(provider).length === 1) {
            provider = getRandomValue(providers, provider);
        }
    }
    const presets = getVisualizers(provider);
    return getRandomValue(presets, currentVisualizer) || defaultVisualizer;
}

function findVisualizer(provider: VisualizerProviderId, name: string): Visualizer {
    const presets = getVisualizers(provider);
    return presets.find((preset) => preset.name === name) || defaultVisualizer;
}

function getVisualizers(provider: VisualizerProviderId): readonly Visualizer[] {
    switch (provider) {
        case 'ambientvideo':
            return getAmbientVideos();

        case 'ampshader':
            return ampshader.visualizers;

        case 'audiomotion':
            return audioMotionPresets;

        case 'milkdrop':
            return butterchurnPresets.get();

        case 'spotifyviz':
            return spotifyviz.visualizers;

        case 'waveform':
            return waveformPresets;

        default:
            return [defaultVisualizer];
    }
}

observeSettings()
    .pipe(
        debounceTime(1),
        map((settings) => (settings.useAmbientVideoSource ? settings.ambientVideoSource : '')),
        distinctUntilChanged(),
        switchMap((url) => (url ? getUserAmbientVideos(url) : of(ambientVideoPresets))),
        catchError((err) => {
            logger.error(err);
            return of([]);
        })
    )
    .subscribe(ambientVideos$);

observeProvider()
    .pipe(
        switchMap((provider) => (provider === 'ambientvideo' ? ambientVideos$ : EMPTY)),
        tap(nextVisualizer)
    )
    .subscribe(logger);

async function getUserAmbientVideos(url = ''): Promise<AmbientVideoVisualizer[]> {
    const src = getYouTubeSrc(url);
    const [, type, id] = src.split(':');
    let videoIds = [id];
    if (type === 'playlist') {
        videoIds = await loadPlaylist(src);
    }
    return videoIds.map((videoId) => ({
        providerId: 'ambientvideo',
        name: videoId,
        src: `youtube:video:${videoId}`,
    }));
}
