import React, {useState} from 'react';
import MediaObjectBrowser from 'components/MediaObjectBrowser';
import MediaPlaylist from 'types/MediaPlaylist';
import {playlistItemsLayout} from 'components/MediaList/layouts';
import PlaylistList from 'components/MediaList/PlaylistList';
import PlaylistItemsList from 'components/MediaList/PlaylistItemsList';
import Splitter from 'components/Splitter';
import usePager from 'hooks/usePager';
import {PagedItemsProps} from './PagedItems';

export default function Playlists({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [[selectedPlaylist], setSelectedPlaylist] = useState<readonly MediaPlaylist[]>([]);
    const [error, setError] = useState<unknown>();
    const [{complete: draggable}] = usePager(selectedPlaylist?.pager);

    const playlistList = (
        <PlaylistList
            {...props}
            title={source.title}
            source={source}
            level={1}
            draggable={draggable}
            onError={setError}
            onSelect={setSelectedPlaylist}
        />
    );

    const playlistItems = (
        <PlaylistItemsList
            title={selectedPlaylist ? `${selectedPlaylist.title}: Tracks` : ''}
            parent={selectedPlaylist}
            defaultLayout={playlistItemsLayout}
            source={source}
            level={2}
            key={selectedPlaylist?.src}
        />
    );

    return (
        <div className="panel">
            {source.singular ? (
                <MediaObjectBrowser item={selectedPlaylist} itemList={playlistList} error={error}>
                    {playlistItems}
                </MediaObjectBrowser>
            ) : source.secondaryItems?.layout?.view === 'none' ? (
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
