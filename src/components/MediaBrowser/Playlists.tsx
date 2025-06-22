import React, {useState} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import {playlistItemsLayout} from 'components/MediaList/layouts';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import Splitter from 'components/Splitter';
import useIsPlaylistPlayable from 'hooks/useIsPlaylistPlayable';
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
            source={source}
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
            source={source}
            level={2}
            emptyMessage="Empty playlist"
            key={selectedPlaylist?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryItems?.layout?.view === 'none' ? (
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
