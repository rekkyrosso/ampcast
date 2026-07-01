import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
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
import RadioPlayer from './players/RadioPlayer';
import OmniPlayer from './players/OmniPlayer';

export class MediaPlayer extends OmniPlayer<PlaylistItem> {
    constructor() {
        super('mediaPlayer');

        // Audio players.
        const hlsAudioPlayer = new HLSPlayer(MediaType.Audio);
        const dualAudioPlayer = new DualAudioPlayer(
            'main',
            new HTML5Player(MediaType.Audio, 'main', 1),
            new HTML5Player(MediaType.Audio, 'main', 2)
        );

        // Radio player.
        const radioPlayer = new RadioPlayer(
            'main',
            new OmniPlayer<MediaItem>('html5Radio', [
                new HTML5Player(MediaType.Audio, 'radio'),
                new HLSPlayer(MediaType.Audio, 'radio'),
            ]),
            (item) => item.src.includes(':radio:') || item.src.includes(':artist-radio:')
        );

        // Video players.
        const hlsVideoPlayer = new HLSPlayer(MediaType.Video);
        const html5VideoPlayer = new HTML5Player(MediaType.Video, 'main');
        const youtubePlayer = new YouTubePlayer('main');

        // These selectors get evaluated in reverse order, so put defaults first.
        this.addPlayers([
            dualAudioPlayer,
            html5VideoPlayer,
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
