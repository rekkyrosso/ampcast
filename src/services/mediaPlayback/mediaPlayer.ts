import MediaType from 'types/MediaType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import musicKitPlayer from 'services/apple/musicKitPlayer';
import spotifyPlayer from 'services/spotify/spotifyPlayer';
import OmniPlayer from 'services/OmniPlayer';
import HTML5Player from 'services/HTML5Player';
import {Logger} from 'utils';

console.log('module::mediaPlayer');

const logger = new Logger('mediaPlayer');

const html5AudioPlayer = new HTML5Player('audio');
const html5VideoPlayer = new HTML5Player('video');
const youtubePlayer = new YouTubePlayer('main');

const players = [html5AudioPlayer, html5VideoPlayer, youtubePlayer, musicKitPlayer, spotifyPlayer];

function selectPlayer(item: PlaylistItem | null) {
    if (item) {
        if (item.src.startsWith('youtube:')) {
            return youtubePlayer;
        } else if (item.src.startsWith('apple:')) {
            return musicKitPlayer;
        } else if (item.src.startsWith('spotify:')) {
            return spotifyPlayer;
        } else if (item.mediaType === MediaType.Video) {
            return html5VideoPlayer;
        } else {
            return html5AudioPlayer;
        }
    } else {
        return null;
    }
}

function loadPlayer(player: Player<string>, item: PlaylistItem | null) {
    player.load(getMediaSource(item));
}

function getMediaSource(item: PlaylistItem | null): string {
    if (!item) {
        return '';
    } else if (item.blob) {
        return URL.createObjectURL(item.blob);
    } else {
        return item.src || '';
    }
}

const mediaPlayer = new OmniPlayer<PlaylistItem | null, string>(players, selectPlayer, loadPlayer);

export default mediaPlayer;

mediaPlayer.observeError().subscribe(logger.error);
mediaPlayer.observePlaying().subscribe(logger.all('playing'));
mediaPlayer.observeEnded().subscribe(logger.all('ended'));
