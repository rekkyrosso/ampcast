import MediaType from 'types/MediaType';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import audio from 'services/audio';
import HLSPlayer from 'services/players/HLSPlayer';
import HTML5Player from 'services/players/HTML5Player';
import ShakaPlayer from 'services/players/ShakaPlayer';
import OmniPlayer from 'services/players/OmniPlayer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import musicKitPlayer from 'services/apple/musicKitPlayer';
import spotifyPlayer from 'services/spotify/spotifyPlayer';

const dashAudioPlayer = new ShakaPlayer('audio', 'dash');
const hlsAudioPlayer = new HLSPlayer('audio', 'hls');
const hlsVideoPlayer = new HLSPlayer('video', 'hls');
const html5AudioPlayer = new HTML5Player('audio', 'main');
const html5VideoPlayer = new HTML5Player('video', 'main');
const youtubePlayer = new YouTubePlayer('main');

function selectPlayer(item: PlaylistItem | null): Player<PlayableItem> | null {
    if (item) {
        if (item.src.startsWith('youtube:')) {
            return youtubePlayer;
        } else if (item.src.startsWith('apple:')) {
            return musicKitPlayer;
        } else if (item.src.startsWith('spotify:')) {
            return spotifyPlayer;
        } else {
            const isVideo = item.mediaType === MediaType.Video;
            switch (item.playbackType) {
                case PlaybackType.DASH:
                    // DASH video not used.
                    return isVideo ? html5VideoPlayer : dashAudioPlayer;
                case PlaybackType.HLS:
                    return isVideo ? hlsVideoPlayer : hlsAudioPlayer;
                default:
                    return isVideo ? html5VideoPlayer : html5AudioPlayer;
            }
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
        throw Error('No source');
    } else if (item.unplayable) {
        throw Error('Unplayable');
    } else if (item.blob) {
        return {src: URL.createObjectURL(item.blob)};
    } else {
        return item;
    }
}

const mediaPlayer = new OmniPlayer<PlaylistItem | null, PlayableItem>(
    'mediaPlayer',
    selectPlayer,
    loadPlayer,
    audio
);

mediaPlayer.registerPlayers([
    dashAudioPlayer,
    hlsAudioPlayer,
    hlsVideoPlayer,
    html5AudioPlayer,
    html5VideoPlayer,
    youtubePlayer,
    musicKitPlayer,
    spotifyPlayer,
]);

export default mediaPlayer;
