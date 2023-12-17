import React, {memo, useCallback, useRef} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import mediaPlayback, {eject} from 'services/mediaPlayback';
import playlist from 'services/playlist';
import AppDragRegion from 'components/App/AppDragRegion';
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
    const item = useCurrentlyPlaying();
    const currentId = item?.id;
    const paused = usePaused();

    // Caused by interaction with the playlist.
    const handlePlay = useCallback(
        (item: PlaylistItem) => {
            if (item.id === currentId) {
                mediaPlayback.play();
            } else {
                mediaPlayback.load(null);
                mediaPlayback.autoplay = true;
                playlist.setCurrentItem(item);
            }
        },
        [currentId]
    );

    return (
        <div className={`media-playback ${paused ? 'paused' : ''}`}>
            <AppDragRegion />
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
