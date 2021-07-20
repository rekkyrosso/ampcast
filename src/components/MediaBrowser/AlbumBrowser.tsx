import React, {useCallback, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Splitter from 'components/Splitter';
import AlbumList from 'components/MediaList/AlbumList';
import MediaItemList from 'components/MediaList/MediaItemList';
import {PagedBrowserProps} from './MediaBrowser';

const defaultAlbumTracksLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'details',
    fields: ['Index', 'Title', 'Artist', 'Duration'],
};

export default function AlbumBrowser({source, ...props}: PagedBrowserProps<MediaAlbum>) {
    const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);

    const handleSelect = useCallback(([album]: readonly MediaAlbum[]) => {
        setSelectedAlbum(album || null);
    }, []);

    return (
        <div className="panel album-browser">
            <Splitter id="album-browser-layout" arrange="rows" primaryIndex={1}>
                <AlbumList {...props} unplayable={source.unplayable} onSelect={handleSelect} />
                <MediaItemList
                    className="album-items"
                    pager={selectedAlbum?.pager}
                    keepAlive={true}
                    layout={source.secondaryLayout || defaultAlbumTracksLayout}
                    unplayable={source.unplayable}
                />
            </Splitter>
        </div>
    );
}
