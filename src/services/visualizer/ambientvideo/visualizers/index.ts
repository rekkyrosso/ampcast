import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, map, of, switchMap} from 'rxjs';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import {observeVisualizerSettings} from 'services/visualizer/visualizerSettings';
import youtubeApi from 'services/youtube/youtubeApi';
import {loadYouTubePlaylist} from 'services/youtube/YouTubePlaylistLoader';
import {Logger} from 'utils';
import defaultAmbientVideos from './defaultAmbientVideos';

const logger = new Logger('ambientvideo/visualizers');

logger.log(`default (total=${defaultAmbientVideos.length})`);

const visualizers$ = new BehaviorSubject<readonly AmbientVideoVisualizer[]>([]);

export function getVisualizers(): readonly AmbientVideoVisualizer[] {
    return visualizers$.getValue();
}

export function observeVisualizers(): Observable<readonly AmbientVideoVisualizer[]> {
    return visualizers$;
}

observeAmbientVideos().subscribe(visualizers$);

function observeAmbientVideos(): Observable<readonly AmbientVideoVisualizer[]> {
    return observeVisualizerSettings().pipe(
        map((settings) => !!settings.useAmbientVideoSource),
        distinctUntilChanged(),
        switchMap((useAmbientVideoSource) =>
            useAmbientVideoSource ? observeUserAmbientVideos() : of(defaultAmbientVideos)
        )
    );
}

function observeUserAmbientVideos(): Observable<readonly AmbientVideoVisualizer[]> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.ambientVideoSource || ''),
        distinctUntilChanged(),
        switchMap((url) => (url ? getUserAmbientVideos(url) : of([])))
    );
}

async function getUserAmbientVideos(url: string): Promise<AmbientVideoVisualizer[]> {
    const src = youtubeApi.getVideoSrc(url);
    const [, type, id] = src.split(':');
    let videoIds: readonly string[] = [id];
    if (type === 'playlist') {
        videoIds = await loadYouTubePlaylist(id);
    }
    return videoIds.map((videoId) => youtubeApi.createAmbientVideo(videoId));
}
