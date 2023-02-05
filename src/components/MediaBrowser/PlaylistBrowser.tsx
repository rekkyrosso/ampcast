import React, {useCallback, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Splitter from 'components/Splitter';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import {PagedBrowserProps} from './MediaBrowser';

const defaultPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Duration', 'Genre'],
};

export default function PlaylistBrowser({
    source,
    className = '',
    ...props
}: PagedBrowserProps<MediaPlaylist>) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);

    const handleSelect = useCallback(([item]: readonly MediaPlaylist[]) => {
        setSelectedPlaylist(item || null);
    }, []);

    return (
        <div className={`panel playlist-browser ${className}`}>
            <Splitter id="playlist-browser-layout" arrange="rows" primaryIndex={1}>
                <PlaylistList {...props} onSelect={handleSelect} />
                <MediaItemList
                    className="playlist-items"
                    pager={selectedPlaylist?.pager}
                    keepAlive={true}
                    layout={source.secondaryLayout || defaultPlaylistItemsLayout}
                />
            </Splitter>
        </div>
    );
}
