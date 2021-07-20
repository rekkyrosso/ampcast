import Player from 'types/Player';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import HTML5Player from 'services/HTML5Player';
import OmniPlayer from 'services/OmniPlayer';

const html5VideoPlayer = new HTML5Player('video');
const youtubePlayer = new YouTubePlayer('ambient', {startTime: 120});
const players = [html5VideoPlayer, youtubePlayer];

function selectPlayer(src: string) {
    if (src) {
        if (src.startsWith('youtube:')) {
            return youtubePlayer;
        } else {
            return html5VideoPlayer;
        }
    } else {
        return null;
    }
}

function loadPlayer(player: Player<string>, src: string) {
    player.load(src);
}

const ambientVideoPlayer = new OmniPlayer(players, selectPlayer, loadPlayer);

ambientVideoPlayer.loop = true;
ambientVideoPlayer.volume = 0;
ambientVideoPlayer.hidden = true;

export default ambientVideoPlayer;
