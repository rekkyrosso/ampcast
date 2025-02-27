import React, {useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import AlbumList from 'components/MediaList/AlbumList';
import MediaItemList from 'components/MediaList/MediaItemList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';
import useAlbumTracksLayout from './useAlbumTracksLayout';

export default function Albums({source, ...props}: PagedItemsProps<MediaAlbum>) {
    const [[selectedAlbum], setSelectedAlbum] = useState<readonly MediaAlbum[]>([]);
    const albumTracksLayout = useAlbumTracksLayout(selectedAlbum, source.secondaryLayout);
    const tracksPager = selectedAlbum?.pager || null;

    const albumList = (
        <AlbumList
            {...props}
            title={source.title}
            onSelect={setSelectedAlbum}
            reportingId={source.id}
        />
    );

    const trackList = (
        <MediaItemList
            title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
            storageId={`${source.id}/tracks`}
            className={`album-tracks ${selectedAlbum?.multiDisc ? 'multi-disc' : ''}`}
            pager={tracksPager}
            layout={albumTracksLayout}
            reportingId={`${source.id}/tracks`}
            key={selectedAlbum?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryLayout?.view === 'none' ? (
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
