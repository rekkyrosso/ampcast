import React, {useCallback, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';

const defaultPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Duration', 'Genre'],
};

export default function Playlists({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);
    const itemsPager = selectedPlaylist?.pager || null;

    const handleSelect = useCallback(([item]: readonly MediaPlaylist[]) => {
        setSelectedPlaylist(item || null);
    }, []);

    const playlistList = (
        <PlaylistList
            {...props}
            title={source.title}
            onSelect={handleSelect}
            reportingId={source.id}
        />
    );

    const playlistItems = (
        <MediaItemList
            title={selectedPlaylist ? `${selectedPlaylist.title}: Tracks` : ''}
            storageId={`${source.id}/items`}
            className="playlist-items"
            pager={itemsPager}
            layout={source.secondaryLayout || defaultPlaylistItemsLayout}
            emptyMessage="Empty playlist"
            reportingId={`${source.id}/items`}
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
