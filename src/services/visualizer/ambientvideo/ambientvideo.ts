import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    catchError,
    debounceTime,
    distinctUntilChanged,
    map,
    of,
    switchMap,
} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import {observeSettings} from 'services/visualizer/visualizerSettings';
import {getYouTubeSrc} from 'services/youtube';
import {loadPlaylist} from 'services/youtube/YouTubePlaylistLoader';
import {Logger} from 'utils';
import ambientVideoPlayer from './ambientVideoPlayer';
import presets from './presets';

console.log('Ambient videos:', presets.length);

const logger = new Logger('ambientvideo');

const ambientVideos$ = new BehaviorSubject<readonly AmbientVideoVisualizer[]>([]);

const ambientvideo: VisualizerProvider<AmbientVideoVisualizer> = {
    id: 'ambientvideo',
    name: 'Ambient Video',
    defaultHidden: true,
    player: ambientVideoPlayer,
    get visualizers() {
        return ambientVideos$.getValue();
    },
    observeVisualizers: () => ambientVideos$,
};

export default ambientvideo;

observeSettings()
    .pipe(
        debounceTime(1),
        map((settings) => !!settings.ambientVideoEnabled),
        distinctUntilChanged(),
        switchMap((ambientVideoEnabled) => (ambientVideoEnabled ? observeAmbientVideos() : of([]))),
        catchError((err) => {
            logger.error(err);
            return of([]);
        })
    )
    .subscribe(ambientVideos$);

function observeAmbientVideos(): Observable<readonly AmbientVideoVisualizer[]> {
    return observeSettings().pipe(
        map((settings) => !!settings.useAmbientVideoSource),
        distinctUntilChanged(),
        switchMap((useAmbientVideoSource) =>
            useAmbientVideoSource ? observeUserAmbientVideos() : of(presets)
        )
    );
}

function observeUserAmbientVideos(): Observable<readonly AmbientVideoVisualizer[]> {
    return observeSettings().pipe(
        map((settings) => settings.ambientVideoSource || ''),
        distinctUntilChanged(),
        switchMap((url) => (url ? getUserAmbientVideos(url) : of([])))
    );
}

async function getUserAmbientVideos(url: string): Promise<AmbientVideoVisualizer[]> {
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
