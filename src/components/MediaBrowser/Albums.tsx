import React, {useCallback, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import AlbumList from 'components/MediaList/AlbumList';
import MediaItemList from 'components/MediaList/MediaItemList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';
import useAlbumTracksLayout from './useAlbumTracksLayout';

export default function Albums({source, ...props}: PagedItemsProps<MediaAlbum>) {
    const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);
    const albumTracksLayout = useAlbumTracksLayout(selectedAlbum, source.secondaryLayout);

    const handleSelect = useCallback(([album]: readonly MediaAlbum[]) => {
        setSelectedAlbum(album || null);
    }, []);

    const albumList = <AlbumList {...props} title={source.title} onSelect={handleSelect} />;

    const trackList = (
        <MediaItemList
            title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
            className={`album-tracks ${selectedAlbum?.multiDisc ? 'multi-disc' : ''}`}
            pager={selectedAlbum?.pager}
            layout={albumTracksLayout}
            key={selectedAlbum?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryLayout?.view === 'none' ? (
                albumList
            ) : (
                <Splitter id="album-browser-layout" arrange="rows" primaryIndex={0}>
                    {albumList}
                    {trackList}
                </Splitter>
            )}
        </div>
    );
}
