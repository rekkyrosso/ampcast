import {
    BehaviorSubject,
    catchError,
    debounceTime,
    distinctUntilChanged,
    map,
    of,
    switchMap,
    tap,
} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import {observeSettings} from 'services/visualizer/visualizerSettings';
import {getYouTubeSrc} from 'services/youtube';
import {loadPlaylist} from 'services/youtube/YouTubePlaylistLoader';
import {Logger} from 'utils';
import ambientVideoPlayer from './ambientVideoPlayer';
import presets from './presets';

const logger = new Logger('ambientvideo');

const ambientVideos$ = new BehaviorSubject<readonly AmbientVideoVisualizer[]>(presets);

const ambientvideo: VisualizerProvider<AmbientVideoVisualizer> = {
    id: 'ambientvideo',
    name: 'Ambient Video',
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
        map((settings) => (settings.useAmbientVideoSource ? settings.ambientVideoSource : '')),
        distinctUntilChanged(),
        switchMap((url) => (url ? getUserAmbientVideos(url) : of(presets))),
        catchError((err) => {
            logger.error(err);
            return of([]);
        }),
        tap((videos) => console.log('Ambient videos:', videos.length))
    )
    .subscribe(ambientVideos$);

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
