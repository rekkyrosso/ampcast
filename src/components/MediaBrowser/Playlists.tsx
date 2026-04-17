import React, {useState} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import {playlistItemsLayout} from 'components/MediaList/layouts';
import PlaylistList from 'components/MediaList/PlaylistList';
import PlaylistItemsList from 'components/MediaList/PlaylistItemsList';
import Splitter from 'components/Splitter';
import usePager from 'hooks/usePager';
import {PagedItemsProps} from './PagedItems';

export default function Playlists({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [[selectedPlaylist], setSelectedPlaylist] = useState<readonly MediaPlaylist[]>([]);
    const [{complete: draggable}] = usePager(selectedPlaylist?.pager);

    const playlistList = (
        <PlaylistList
            {...props}
            title={source.title}
            source={source}
            level={1}
            draggable={draggable}
            onSelect={setSelectedPlaylist}
        />
    );

    const playlistItems = (
        <PlaylistItemsList
            title={selectedPlaylist ? `${selectedPlaylist.title}: Tracks` : ''}
            parentPlaylist={selectedPlaylist}
            defaultLayout={playlistItemsLayout}
            source={source}
            level={2}
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
