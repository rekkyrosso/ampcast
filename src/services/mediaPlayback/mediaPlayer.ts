import MediaType from 'types/MediaType';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import HTML5Player from 'services/players/HTML5Player';
import hlsPlayer from 'services/players/hlsPlayer';
import OmniPlayer from 'services/players/OmniPlayer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import musicKitPlayer from 'services/apple/musicKitPlayer';
import spotifyPlayer from 'services/spotify/spotifyPlayer';

const playerId = 'main';
const html5AudioPlayer = new HTML5Player('audio', playerId);
const html5VideoPlayer = new HTML5Player('video', playerId);
const youtubePlayer = new YouTubePlayer(playerId);

function selectPlayer(item: PlaylistItem | null): Player<PlayableItem> | null {
    if (item) {
        if (item.src.startsWith('youtube:')) {
            return youtubePlayer;
        } else if (item.src.startsWith('apple:')) {
            return musicKitPlayer;
        } else if (item.src.startsWith('spotify:')) {
            return spotifyPlayer;
        } else if (item.mediaType === MediaType.Video) {
            if (item.videoFormat === 'hls') {
                return hlsPlayer;
            } else {
                return html5VideoPlayer;
            }
        } else {
            return html5AudioPlayer;
        }
    } else {
        return null;
    }
}

function loadPlayer(player: Player<PlayableItem>, item: PlaylistItem | null): void {
    player.load(getMediaSource(item));
}

function getMediaSource(item: PlaylistItem | null): PlayableItem {
    if (!item) {
        return {src: ''};
    } else if (item.blob) {
        return {src: URL.createObjectURL(item.blob)};
    } else if (item.unplayable) {
        // TODO: Do this better
        const parts = item.src.split(':');
        parts[2] = 'UNPLAYABLE';
        return {src: parts.join(':')};
    } else {
        return item;
    }
}

const mediaPlayer = new OmniPlayer<PlaylistItem | null, PlayableItem>(
    'media-player',
    [html5AudioPlayer, html5VideoPlayer, youtubePlayer, musicKitPlayer, spotifyPlayer, hlsPlayer],
    selectPlayer,
    loadPlayer
);

export default mediaPlayer;
