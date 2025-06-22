import React, {useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import AlbumList from 'components/MediaList/AlbumList';
import MediaItemList from 'components/MediaList/MediaItemList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';
import useAlbumTracksLayout from './useAlbumTracksLayout';

export default function Albums({source, ...props}: PagedItemsProps<MediaAlbum>) {
    const [[selectedAlbum], setSelectedAlbum] = useState<readonly MediaAlbum[]>([]);
    const albumTracksLayout = useAlbumTracksLayout(selectedAlbum);
    const tracksPager = selectedAlbum?.pager || null;

    const albumList = (
        <AlbumList
            {...props}
            title={source.title}
            layoutOptions={source.primaryItems?.layout}
            source={source}
            level={1}
            onSelect={setSelectedAlbum}
        />
    );

    const trackList = (
        <MediaItemList
            title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
            className={`album-tracks ${selectedAlbum?.multiDisc ? 'multi-disc' : ''}`}
            pager={tracksPager}
            defaultLayout={albumTracksLayout}
            layoutOptions={source.secondaryItems?.layout}
            source={source}
            level={2}
            key={selectedAlbum?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryItems?.layout?.view === 'none' ? (
                albumList
            ) : (
                <Splitter id="albums-tracks-layout" arrange="rows">
                    {albumList}
                    {trackList}
                </Splitter>
            )}
        </div>
    );
}
