import React, {useCallback, useState} from 'react';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Splitter from 'components/Splitter';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import {PagedBrowserProps} from './MediaBrowser'
import MediaItem from 'types/MediaItem';

const defaultPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Duration', 'Genre', 'PlayCount'],
};

export default function PlaylistBrowser({source, ...props}: PagedBrowserProps<MediaPlaylist>) {
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);

    const handleSelect = useCallback(([item]: readonly MediaPlaylist[]) => {
        setSelectedPlaylist(item || null);
    }, []);

    return (
        <div className="panel playlist-browser">
            <Splitter id="playlist-browser-layout" arrange="rows" primaryIndex={1}>
                <PlaylistList {...props} unplayable={source.unplayable} onSelect={handleSelect} />
                <MediaItemList
                    className="playlist-items"
                    pager={selectedPlaylist?.pager}
                    keepAlive={true}
                    layout={source.secondaryLayout || defaultPlaylistItemsLayout}
                    unplayable={source.unplayable}
                />
            </Splitter>
        </div>
    );
}
