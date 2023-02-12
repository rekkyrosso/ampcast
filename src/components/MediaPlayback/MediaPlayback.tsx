import React, {memo, useCallback} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import mediaPlayback, {eject} from 'services/mediaPlayback';
import playlist from 'services/playlist';
import Media from 'components/Media';
import MediaControls from 'components/MediaControls';
import Playlist from 'components/Playlist';
import Splitter from 'components/Splitter';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import './MediaPlayback.scss';

console.log('component::MediaPlayback');

export default memo(function MediaPlayback() {
    const currentlyPlaying = useCurrentlyPlaying();
    const paused = usePaused();

    // Caused by interaction with the playlist.
    const handlePlay = useCallback(
        (item: PlaylistItem) => {
            if (item === currentlyPlaying) {
                mediaPlayback.play();
            } else {
                mediaPlayback.load(null);
                mediaPlayback.autoplay = true;
                playlist.setCurrentItem(item);
            }
        },
        [currentlyPlaying]
    );

    return (
        <div className={`media-playback ${paused ? 'paused' : ''}`}>
            <Splitter id="media-playback-layout" arrange="rows">
                <div className="panel playback">
                    <MediaControls />
                    <Playlist onPlay={handlePlay} onEject={eject} />
                </div>
                <Media />
            </Splitter>
        </div>
    );
});
