import React, {memo, useRef} from 'react';
import {eject, loadAndPlay} from 'services/mediaPlayback';
import AppDragRegion from 'components/App/AppDragRegion';
import {ListViewHandle} from 'components/ListView';
import Media from 'components/Media';
import MediaControls from 'components/MediaControls';
import Playlist from 'components/Playlist';
import Splitter from 'components/Splitter';
import './MediaPlayback.scss';

export default memo(function MediaPlayback() {
    const playlistRef = useRef<ListViewHandle>(null);

    return (
        <div className="media-playback">
            <AppDragRegion />
            <Splitter id="media-playback-layout" arrange="rows">
                <div className="panel playback">
                    <MediaControls playlistRef={playlistRef} />
                    <Playlist onPlay={loadAndPlay} onEject={eject} ref={playlistRef} />
                </div>
                <Media />
            </Splitter>
        </div>
    );
});
