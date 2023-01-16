import MediaType from 'types/MediaType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import musicKitPlayer from 'services/apple/musicKitPlayer';
import spotifyPlayer from 'services/spotify/spotifyPlayer';
import OmniPlayer from 'services/players/OmniPlayer';
import HTML5Player from 'services/players/HTML5Player';

console.log('module::mediaPlayer');

const html5AudioPlayer = new HTML5Player('audio', 'main');
const html5VideoPlayer = new HTML5Player('video', 'main');
const youtubePlayer = new YouTubePlayer('main');

function selectPlayer(item: PlaylistItem | null): Player<string> | null {
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

function loadPlayer(player: Player<string>, item: PlaylistItem | null): void {
    if (item?.unplayable) {
        throw Error('Unplayable.');
    } else {
        player.load(getMediaSource(item));
    }
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

const mediaPlayer = new OmniPlayer<PlaylistItem | null, string>(
    'media-player',
    [html5AudioPlayer, html5VideoPlayer, youtubePlayer, musicKitPlayer, spotifyPlayer],
    selectPlayer,
    loadPlayer
);

export default mediaPlayer;
