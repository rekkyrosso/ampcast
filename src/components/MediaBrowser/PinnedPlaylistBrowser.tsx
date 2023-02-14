import React, {useCallback, useEffect, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import pinStore from 'services/pins/pinStore';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import {PagedBrowserProps} from './MediaBrowser';
import './PinnedPlaylistBrowser.scss';

const defaultLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Owner'],
};

const defaultPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

export default function PinnedPlaylistBrowser({
    source,
    className = '',
    ...props
}: PagedBrowserProps<MediaPlaylist>) {
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
        <div className={`panel playlist-browser pinned-playlist-browser ${className}`}>
            <PlaylistList
                {...props}
                layout={source.layout || defaultLayout}
                onSelect={handleSelect}
                statusBar={false}
                disabled
            />
            <MediaItemList
                className="playlist-items"
                pager={selectedPlaylist?.pager}
                keepAlive={true}
                layout={source.secondaryLayout || defaultPlaylistItemsLayout}
            />
        </div>
    );
}
