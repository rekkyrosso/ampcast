import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';
import audio from 'services/audio';
import preferences from 'services/preferences';
import mixcloudPlayer from 'services/mixcloud/mixcloudPlayer';
import soundcloudPlayer from 'services/soundcloud/soundcloudPlayer';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import GaplessPlayer from './players/GaplessPlayer';
import HLSPlayer from './players/HLSPlayer';
import hlsMetadataPlayer from './players/hlsMetadataPlayer';
import HTML5Player from './players/HTML5Player';
import icecastPlayer from './players/icecastPlayer';
import RadioPlayer from './players/RadioPlayer';
import OmniPlayer from './players/OmniPlayer';

// Audio players.
const html5AudioPlayer = new HTML5Player(MediaType.Audio, 'main');
const hlsAudioPlayer = new HLSPlayer(MediaType.Audio);
const gaplessAudioPlayer = new GaplessPlayer(
    new HTML5Player(MediaType.Audio, 'gapless', 1),
    new HTML5Player(MediaType.Audio, 'gapless', 2)
);

// Video players.
const hlsVideoPlayer = new HLSPlayer(MediaType.Video);
const html5VideoPlayer = new HTML5Player(MediaType.Video, 'main');
const youtubePlayer = new YouTubePlayer('main');

// Radio player.
const radioPlayer = new RadioPlayer([
    html5AudioPlayer,
    hlsAudioPlayer,
    youtubePlayer, // last.fm radio lookups might return YouTube videos (unlikely, but possible).
]);

export class MediaPlayer extends OmniPlayer<PlaylistItem> {
    constructor() {
        // These players get evaluated in reverse order, so put defaults first.
        super('mediaPlayer', [
            html5AudioPlayer,
            html5VideoPlayer,
            gaplessAudioPlayer,
            hlsAudioPlayer,
            hlsVideoPlayer,
            icecastPlayer,
            hlsMetadataPlayer,
            radioPlayer,
            mixcloudPlayer,
            soundcloudPlayer,
            youtubePlayer,
        ]);
    }

    get muted(): boolean {
        return super.muted;
    }

    set muted(muted: boolean) {
        super.muted = muted;
        audio.volume = this.muted ? 0 : this.volume;
    }

    get volume(): number {
        return super.volume;
    }

    set volume(volume: number) {
        super.volume = volume;
        audio.volume = this.muted ? 0 : this.volume;
    }

    addPlayer(player: Player<MediaItem>, addToRadioPlayer?: boolean): void {
        if (addToRadioPlayer) {
            radioPlayer.addPlayer(player);
        }
        super.addPlayer(player);
    }

    protected validate(item: PlaylistItem | null): item is PlaylistItem {
        if (super.validate(item)) {
            if (item.unplayable) {
                throw Error('Not playable');
            } else if (preferences.disableExplicitContent && item.explicit) {
                throw Error('Not playable (explicit)');
            } else {
                return true;
            }
        } else {
            // `super.validate` will throw if `item` is null, so we'll never get here.
            return false;
        }
    }
}

export default new MediaPlayer();
