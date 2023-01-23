import React, {useCallback, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Splitter from 'components/Splitter';
import MediaItemList from 'components/MediaList/MediaItemList';
import AlbumList from 'components/MediaList/AlbumList';
import ArtistList from 'components/MediaList/ArtistList';
import {PagedBrowserProps} from './MediaBrowser';

const defaultAlbumsLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Year'],
};

const defaultAlbumTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Title', 'Artist', 'Duration'],
};

const defaultTopTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Title', 'Artist', 'Duration', 'Album', 'Year'],
};

export default function ArtistBrowser({source, ...props}: PagedBrowserProps<MediaArtist>) {
    const [selectedArtist, setSelectedArtist] = useState<MediaArtist | null>(null);
    const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);
    const [defaultTracksLayout, setDefaultTracksLayout] =
        useState<MediaSourceLayout<MediaItem>>(defaultAlbumTracksLayout);

    const handleArtistSelect = useCallback(([artist]: readonly MediaArtist[]) => {
        setSelectedArtist(artist || null);
    }, []);

    const handleAlbumSelect = useCallback(([album]: readonly MediaAlbum[]) => {
        setSelectedAlbum(album || null);
        setDefaultTracksLayout(
            /^\w+:top-tracks/.test(album?.src) ? defaultTopTracksLayout : defaultAlbumTracksLayout
        );
    }, []);

    return (
        <div className="panel artist-browser">
            <Splitter id="artist-browser-layout" arrange="columns" primaryIndex={0}>
                <ArtistList {...props} onSelect={handleArtistSelect} />
                <Splitter id="artist-album-browser-layout" arrange="rows" primaryIndex={1}>
                    <AlbumList
                        className="artist-albums"
                        pager={selectedArtist?.pager}
                        keepAlive={true}
                        layout={source.secondaryLayout || defaultAlbumsLayout}
                        onSelect={handleAlbumSelect}
                    />
                    <MediaItemList
                        className="album-items"
                        pager={selectedAlbum?.pager}
                        keepAlive={true}
                        layout={source.tertiaryLayout || defaultTracksLayout}
                    />
                </Splitter>
            </Splitter>
        </div>
    );
}
