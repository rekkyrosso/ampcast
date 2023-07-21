import React, {useCallback, useEffect, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import pinStore from 'services/pins/pinStore';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import {PagedItemsProps} from './PagedItems';
import './PinnedPlaylist.scss';

const defaultLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card',
    fields: ['Thumbnail', 'IconTitle', 'TrackCount', 'Owner'],
};

const defaultPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

export default function PinnedPlaylist({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);

    useEffect(() => () => pinStore.unlock(), [source]);

    useEffect(() => {
        if (selectedPlaylist) {
            pinStore.lock(selectedPlaylist);
        }
    }, [selectedPlaylist]);

    const handleSelect = useCallback(([item]: readonly MediaPlaylist[]) => {
        setSelectedPlaylist(item || null);
    }, []);

    return (
        <div className="panel pinned-playlist">
            <PlaylistList
                {...props}
                title={source.title}
                layout={source.layout || defaultLayout}
                onSelect={handleSelect}
                statusBar={false}
                disabled
            />
            <MediaItemList
                title={`${source.title}: Tracks`}
                className="playlist-items"
                pager={selectedPlaylist?.pager}
                layout={source.secondaryLayout || defaultPlaylistItemsLayout}
            />
        </div>
    );
}
