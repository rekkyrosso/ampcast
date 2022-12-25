import {filter, map, tap, withLatestFrom} from 'rxjs/operators';
import Player from 'types/Player';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import HTML5Player from 'services/players/HTML5Player';
import OmniPlayer from 'services/players/OmniPlayer';
import {LiteStorage, Logger} from 'utils';
import visualizerSettings from '../visualizerSettings';

const logger = new Logger('ambientVideoPlayer');

type ProgressRecord = Record<string, number | undefined>;

const html5Player = new HTML5Player('video', 'ambient');
const youtubePlayer = new YouTubePlayer('ambient');
const storage = new LiteStorage('ambientVideoPlayer');

function selectPlayer(visualizer: AmbientVideoVisualizer): Player<string> | null {
    if (visualizer) {
        if (visualizer.src.startsWith('youtube:')) {
            return youtubePlayer;
        } else {
            return html5Player;
        }
    } else {
        return null;
    }
}

function loadPlayer(player: Player<string>, visualizer: AmbientVideoVisualizer): void {
    const src = visualizer.src;
    if (src.startsWith('youtube:')) {
        const [, , videoId] = src.split(':');
        const progress = storage.getJson<ProgressRecord>('progress', {});
        const startTime = progress[videoId] || (visualizerSettings.useAmbientVideoSource ? 0 : 120);
        player.load(`${src}:${startTime}`);
    } else {
        player.load(src);
    }
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
    .observeCurrentTime()
    .pipe(
        map(Math.round),
        filter((time) => time > 120 && time % 30 === 0),
        withLatestFrom(youtubePlayer.observeDuration(), youtubePlayer.observeVideoId()),
        tap(([time, duration, videoId]) => {
            // Longer than ten minutes.
            if (duration > 600) {
                const progress = storage.getJson<ProgressRecord>('progress', {});
                progress[videoId] = time;
                storage.setJson('progress', progress);
            }
        })
    )
    .subscribe(logger);

export default ambientVideoPlayer;
