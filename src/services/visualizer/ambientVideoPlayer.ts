import {filter, map, tap, withLatestFrom} from 'rxjs/operators';
import Player from 'types/Player';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import HTML5Player from 'services/HTML5Player';
import OmniPlayer from 'services/OmniPlayer';
import {LiteStorage, Logger} from 'utils';

const logger = new Logger('ambientVideoPlayer');

const html5Player = new HTML5Player('video');
const youtubePlayer = new YouTubePlayer('ambient');
const players = [html5Player, youtubePlayer];
const storage = new LiteStorage('ambientVideoPlayer/progress');

function selectPlayer(visualizer: AmbientVideoVisualizer) {
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

function loadPlayer(player: Player<string>, visualizer: AmbientVideoVisualizer) {
    const src = visualizer.src;
    if (src.startsWith('youtube:')) {
        const [, , videoId] = src.split(':');
        const startTime = storage.getNumber(videoId, 120);
        player.load(`${src}:${startTime}`);
    } else {
        player.load(src);
    }
}

const ambientVideoPlayer = new OmniPlayer<AmbientVideoVisualizer, string>(
    players,
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
        withLatestFrom(youtubePlayer.observeVideoId()),
        tap(([time, videoId]) => storage.setNumber(videoId, time))
    )
    .subscribe(logger);

export default ambientVideoPlayer;
