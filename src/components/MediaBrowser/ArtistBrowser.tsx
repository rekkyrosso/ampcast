import React, {useCallback, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import Splitter from 'components/Splitter';
import MediaItemList from 'components/MediaList/MediaItemList';
import AlbumList from 'components/MediaList/AlbumList';
import ArtistList from 'components/MediaList/ArtistList';
import {PagedBrowserProps} from './MediaBrowser';
import MediaSourceLayout from 'types/MediaSourceLayout';

const defaultAlbumsLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Year'],
};

const defaultAlbumTracksLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'details',
    fields: ['Index', 'Title', 'Artist', 'Duration'],
};

export default function ArtistBrowser({source, ...props}: PagedBrowserProps<MediaArtist>) {
    const [selectedArtist, setSelectedArtist] = useState<MediaArtist | null>(null);
    const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);

    const handleArtistSelect = useCallback(([artist]: readonly MediaArtist[]) => {
        setSelectedArtist(artist || null);
    }, []);

    const handleAlbumSelect = useCallback(([album]: readonly MediaAlbum[]) => {
        setSelectedAlbum(album || null);
    }, []);

    return (
        <div className="panel artist-browser">
            <Splitter id="artist-browser-layout" arrange="columns" primaryIndex={0}>
                <ArtistList
                    {...props}
                    unplayable={source.unplayable}
                    onSelect={handleArtistSelect}
                />
                <Splitter id="artist-album-browser-layout" arrange="rows" primaryIndex={1}>
                    <AlbumList
                        className="artist-albums"
                        pager={selectedArtist?.pager}
                        keepAlive={true}
                        layout={source.secondaryLayout || defaultAlbumsLayout}
                        unplayable={source.unplayable}
                        onSelect={handleAlbumSelect}
                    />
                    <MediaItemList
                        className="album-items"
                        pager={selectedAlbum?.pager}
                        keepAlive={true}
                        layout={source.tertiaryLayout || defaultAlbumTracksLayout}
                        unplayable={source.unplayable}
                    />
                </Splitter>
            </Splitter>
        </div>
    );
}
