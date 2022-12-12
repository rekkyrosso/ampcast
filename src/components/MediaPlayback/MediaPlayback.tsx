import React, {useCallback} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import mediaPlayback, {eject} from 'services/mediaPlayback';
import playlist from 'services/playlist';
import Media from 'components/Media';
import MediaPlaybackBar from 'components/MediaPlaybackBar';
import Playlist from 'components/Playlist';
import Splitter from 'components/Splitter';
import usePaused from 'hooks/usePaused';
import './MediaPlayback.scss';

console.log('component::MediaPlayback');

export default function MediaPlayback() {
    const paused = usePaused();

    // Caused by interaction with the playlist.
    const handlePlay = useCallback((item: PlaylistItem) => {
        mediaPlayback.stop();
        mediaPlayback.autoplay = true;
        playlist.setCurrentItem(item);
        mediaPlayback.play();
    }, []);

    return (
        <div className={`media-playback ${paused ? 'paused' : ''}`}>
            <Splitter id="media-playback-layout" arrange="rows">
                <div className="panel playback">
                    <MediaPlaybackBar />
                    <Playlist onPlay={handlePlay} onEject={eject} />
                </div>
                <Media />
            </Splitter>
        </div>
    );
}
