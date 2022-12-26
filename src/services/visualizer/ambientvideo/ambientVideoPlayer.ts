import {
    distinctUntilChanged,
    filter,
    map,
    skip,
    switchMap,
    tap,
    withLatestFrom,
} from 'rxjs/operators';
import Player from 'types/Player';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import HTML5Player from 'services/players/HTML5Player';
import OmniPlayer from 'services/players/OmniPlayer';
import {LiteStorage, Logger} from 'utils';
import visualizerSettings, {observeVisualizerSettings} from '../visualizerSettings';
import {EMPTY} from 'rxjs';

const logger = new Logger('ambientVideoPlayer');

type ProgressRecord = Record<string, number | undefined>;

const html5Player = new HTML5Player('video', 'ambient');
const youtubePlayer = new YouTubePlayer('ambient');
const storage = new LiteStorage('ambientVideoPlayer');

function selectPlayer(visualizer: AmbientVideoVisualizer): Player<string> | null {
    if (visualizer) {
        if (visualizer.src.startsWith('youtube:')) {
            return youtubePlayer;
        }
        return html5Player;
    }
    return null;
}

function loadPlayer(player: Player<string>, visualizer: AmbientVideoVisualizer): void {
    const src = visualizer.src;
    if (src.startsWith('youtube:')) {
        const [, , videoId] = src.split(':');
        const key = getProgressKey();
        const progress = storage.getJson<ProgressRecord>(key, {});
        const startTime = progress[videoId] || (key === 'progress' ? 120 : 0);
        player.load(`${src}:${startTime}`);
    } else {
        player.load(src);
    }
}

function getProgressKey(): string {
    return visualizerSettings.useAmbientVideoSource && visualizerSettings.ambientVideoSource
        ? 'user-progress'
        : 'progress';
}

const ambientVideoPlayer = new OmniPlayer<AmbientVideoVisualizer, string>(
    [html5Player, youtubePlayer],
    selectPlayer,
    loadPlayer
);

ambientVideoPlayer.loop = true;
ambientVideoPlayer.volume = 0;
ambientVideoPlayer.hidden = true;

youtubePlayer
    .observeVideoId()
    .pipe(
        switchMap((videoId) =>
            videoId
                ? youtubePlayer.observeCurrentTime().pipe(
                      map(Math.round),
                      distinctUntilChanged(),
                      filter((time) => time > 0 && time % 30 === 0),
                      withLatestFrom(youtubePlayer.observeDuration()),
                      filter(([, duration]) => duration > 600),
                      tap(([time]) => {
                          const key = getProgressKey();
                          const progress = storage.getJson<ProgressRecord>(key, {});
                          progress[videoId] = time;
                          storage.setJson(key, progress);
                      })
                  )
                : EMPTY
        )
    )
    .subscribe(logger);

observeVisualizerSettings()
    .pipe(
        map((settings) => settings.ambientVideoSource),
        distinctUntilChanged(),
        skip(1),
        tap(() => storage.removeItem('user-progress'))
    )
    .subscribe(logger);

export default ambientVideoPlayer;
