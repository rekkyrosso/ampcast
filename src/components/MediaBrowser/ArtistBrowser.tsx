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

export default function ArtistBrowser({
    source,
    className = '',
    ...props
}: PagedBrowserProps<MediaArtist>) {
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
        <div className={`panel artist-browser ${className}`}>
            <Splitter id="artist-browser-layout" arrange="columns" primaryIndex={0}>
                <ArtistList {...props} title={source.title} onSelect={handleArtistSelect} />
                <Splitter id="artist-album-browser-layout" arrange="rows" primaryIndex={1}>
                    <AlbumList
                        title={selectedArtist ? `${selectedArtist.title}: Albums` : ''}
                        className="artist-albums"
                        pager={selectedArtist?.pager}
                        keepAlive={true}
                        layout={source.secondaryLayout || defaultAlbumsLayout}
                        onSelect={handleAlbumSelect}
                        key={selectedArtist?.src}
                    />
                    <MediaItemList
                        title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
                        className="album-items"
                        pager={selectedAlbum?.pager}
                        keepAlive={true}
                        layout={source.tertiaryLayout || defaultTracksLayout}
                        key={selectedAlbum?.src}
                    />
                </Splitter>
            </Splitter>
        </div>
    );
}
