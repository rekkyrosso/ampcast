import type {Observable} from 'rxjs';
import {BehaviorSubject, of} from 'rxjs';
import {
    catchError,
    debounceTime,
    distinctUntilChanged,
    map,
    skipWhile,
    switchMap,
} from 'rxjs/operators';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import {observeVisualizerSettings} from 'services/visualizer/visualizerSettings';
import {getYouTubeSrc} from 'services/youtube';
import {loadYouTubePlaylist} from 'services/youtube/YouTubeLoader';
import {Logger} from 'utils';
import defaultAmbientVideos from './defaultAmbientVideos';

console.log('Default ambient videos:', defaultAmbientVideos.length);

const logger = new Logger('ambientvideo/visualizers');

const visualizers$ = new BehaviorSubject<readonly AmbientVideoVisualizer[]>([]);

export function getVisualizers(): readonly AmbientVideoVisualizer[] {
    return visualizers$.getValue();
}

export function observeVisualizers(): Observable<readonly AmbientVideoVisualizer[]> {
    return visualizers$;
}

observeVisualizerSettings()
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
    .subscribe(visualizers$);

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
    const src = getYouTubeSrc(url);
    const [, type, id] = src.split(':');
    let videoIds = [id];
    if (type === 'playlist') {
        videoIds = await loadYouTubePlaylist(src);
    }
    return videoIds.map((videoId) => ({
        providerId: 'ambientvideo',
        name: videoId,
        src: `youtube:video:${videoId}`,
    }));
}

// logging
observeVisualizers()
    .pipe(
        map((ambientVideos) => ambientVideos.length),
        skipWhile((size) => size === 0)
    )
    .subscribe(logger.rx('size'));
