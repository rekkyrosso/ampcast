import React, {useState} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import {playlistItemsLayout} from 'components/MediaList/layouts';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import useIsPlaylistPlayable from 'components/MediaList/useIsPlaylistPlayable';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';

export default function Playlists({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [[selectedPlaylist], setSelectedPlaylist] = useState<readonly MediaPlaylist[]>([]);
    const draggable = useIsPlaylistPlayable(selectedPlaylist);
    const itemsPager = selectedPlaylist?.pager || null;

    const playlistList = (
        <PlaylistList
            {...props}
            title={source.title}
            layoutOptions={source.primaryItems?.layout}
            sourceId={source.id}
            level={1}
            draggable={draggable}
            onSelect={setSelectedPlaylist}
        />
    );

    const playlistItems = (
        <MediaItemList
            title={selectedPlaylist ? `${selectedPlaylist.title}: Tracks` : ''}
            className="playlist-items"
            pager={itemsPager}
            defaultLayout={playlistItemsLayout}
            layoutOptions={source.secondaryItems?.layout}
            sourceId={source.id}
            level={2}
            emptyMessage="Empty playlist"
            key={selectedPlaylist?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryLayout?.view === 'none' ? (
                playlistList
            ) : (
                <Splitter id="playlists-items-layout" arrange="rows">
                    {playlistList}
                    {playlistItems}
                </Splitter>
            )}
        </div>
    );
}
