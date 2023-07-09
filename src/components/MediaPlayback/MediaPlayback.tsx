import React, {memo, useCallback, useRef} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import mediaPlayback, {eject} from 'services/mediaPlayback';
import playlist from 'services/playlist';
import {ListViewHandle} from 'components/ListView';
import Media from 'components/Media';
import MediaControls from 'components/MediaControls';
import Playlist from 'components/Playlist';
import Splitter from 'components/Splitter';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import './MediaPlayback.scss';

export default memo(function MediaPlayback() {
    const listViewRef = useRef<ListViewHandle>(null);
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
                    <MediaControls listViewRef={listViewRef} />
                    <Playlist onPlay={handlePlay} onEject={eject} listViewRef={listViewRef} />
                </div>
                <Media />
            </Splitter>
        </div>
    );
});
