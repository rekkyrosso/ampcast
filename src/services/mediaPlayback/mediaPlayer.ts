import MediaType from 'types/MediaType';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import audio from 'services/audio';
import {getServiceFromSrc} from 'services/mediaServices';
import preferences from 'services/preferences';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import HLSPlayer from './players/HLSPlayer';
import HTML5Player from './players/HTML5Player';
import ShakaPlayer from './players/ShakaPlayer';
import OmniPlayer from './players/OmniPlayer';

const dashAudioPlayer = new ShakaPlayer('audio', 'dash');
const hlsAudioPlayer = new HLSPlayer('audio', 'hls');
const hlsVideoPlayer = new HLSPlayer('video', 'hls');
const html5AudioPlayer = new HTML5Player('audio', 'main');
const html5VideoPlayer = new HTML5Player('video', 'main');
const youtubePlayer = new YouTubePlayer('main');

function loadPlayer(player: Player<PlayableItem>, item: PlaylistItem | null): void {
    player.load(getPlayableItem(item));
}

function getPlayableItem(item: PlaylistItem | null): PlayableItem {
    if (!item) {
        throw Error('No source');
    } else if (!isPlayable(item)) {
        if (preferences.disableExplicitContent && item.explicit) {
            throw Error('Not playable (explicit)');
        } else {
            throw Error('Not playable');
        }
    } else if (item.blobUrl) {
        return {...item, src: item.blobUrl};
    } else if (item.blob) {
        return {...item, src: URL.createObjectURL(item.blob)};
    } else {
        return item;
    }
}

function isPlayable(item: PlaylistItem): boolean {
    const service = getServiceFromSrc(item);
    return !(
        service?.disabled ||
        item.unplayable ||
        (preferences.disableExplicitContent && item.explicit)
    );
}

const mediaPlayer = new OmniPlayer<PlaylistItem | null, PlayableItem>(
    'mediaPlayer',
    loadPlayer,
    audio
);

mediaPlayer.registerPlayers([
    // These selectors get evaluated in reverse order.
    // So put defaults first.
    [html5AudioPlayer, (item) => item?.mediaType === MediaType.Audio],
    [html5VideoPlayer, (item) => item?.mediaType === MediaType.Video],
    [
        dashAudioPlayer,
        (item) => item?.mediaType === MediaType.Audio && item.playbackType === PlaybackType.DASH,
    ],
    [
        hlsAudioPlayer,
        (item) => item?.mediaType === MediaType.Audio && item.playbackType === PlaybackType.HLS,
    ],
    [
        hlsVideoPlayer,
        (item) => item?.mediaType === MediaType.Video && item.playbackType === PlaybackType.HLS,
    ],
    [youtubePlayer, (item) => !!item?.src.startsWith('youtube:')],
]);

export default mediaPlayer;
