import MediaType from 'types/MediaType';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import audio from 'services/audio';
import preferences from 'services/preferences';
import mixcloudPlayer from 'services/mixcloud/mixcloudPlayer';
import soundcloudPlayer from 'services/soundcloud/soundcloudPlayer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import DualAudioPlayer from './players/DualAudioPlayer';
import HLSPlayer from './players/HLSPlayer';
import hlsMetadataPlayer from './players/hlsMetadataPlayer';
import HTML5Player from './players/HTML5Player';
import icecastPlayer from './players/icecastPlayer';
import OmniPlayer from './players/OmniPlayer';

// Audio players.
const hlsAudioPlayer = new HLSPlayer('audio');
const html5AudioPlayer = new DualAudioPlayer(
    'main',
    new HTML5Player('audio', 'main', 1),
    new HTML5Player('audio', 'main', 2)
);

// Video players.
const hlsVideoPlayer = new HLSPlayer('video');
const html5VideoPlayer = new HTML5Player('video', 'main');
const youtubePlayer = new YouTubePlayer('main');

function mapMediaSrc(item: PlaylistItem | null): PlayableItem {
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
    return !(item.unplayable || (preferences.disableExplicitContent && item.explicit));
}

const mediaPlayer = new OmniPlayer<PlaylistItem | null, PlayableItem>(
    'mediaPlayer',
    mapMediaSrc,
    audio
);

mediaPlayer.registerPlayers([
    // These selectors get evaluated in reverse order.
    // So put defaults first.
    [html5AudioPlayer, (item) => item?.mediaType === MediaType.Audio],
    [html5VideoPlayer, (item) => item?.mediaType === MediaType.Video],
    [
        hlsAudioPlayer,
        (item) => item?.mediaType === MediaType.Audio && item.playbackType === PlaybackType.HLS,
    ],
    [
        hlsVideoPlayer,
        (item) => item?.mediaType === MediaType.Video && item.playbackType === PlaybackType.HLS,
    ],
    [
        icecastPlayer,
        (item) =>
            item?.mediaType === MediaType.Audio &&
            [PlaybackType.Icecast, PlaybackType.IcecastM3u, PlaybackType.IcecastOgg].includes(
                item.playbackType!
            ),
    ],
    [
        hlsMetadataPlayer,
        (item) =>
            item?.mediaType === MediaType.Audio && item.playbackType === PlaybackType.HLSMetadata,
    ],
    [mixcloudPlayer, (item) => !!item?.src.startsWith('mixcloud:')],
    [soundcloudPlayer, (item) => !!item?.src.startsWith('soundcloud:')],
    [youtubePlayer, (item) => !!item?.src.startsWith('youtube:')],
]);

export default mediaPlayer;
