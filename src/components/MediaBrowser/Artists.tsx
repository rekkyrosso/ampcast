import React, {useCallback, useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaItemList from 'components/MediaList/MediaItemList';
import AlbumList from 'components/MediaList/AlbumList';
import ArtistList from 'components/MediaList/ArtistList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';
import useAlbumTracksLayout from './useAlbumTracksLayout';

const defaultAlbumsLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Year'],
};

export default function Artists({source, ...props}: PagedItemsProps<MediaArtist>) {
    const [selectedArtist, setSelectedArtist] = useState<MediaArtist | null>(null);
    const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);
    const albumTracksLayout = useAlbumTracksLayout(selectedAlbum, source.tertiaryLayout);
    const albumsPager = selectedArtist?.pager || null;
    const tracksPager = selectedAlbum?.pager || null;

    const handleArtistSelect = useCallback(([artist]: readonly MediaArtist[]) => {
        setSelectedArtist(artist || null);
    }, []);

    const handleAlbumSelect = useCallback(([album]: readonly MediaAlbum[]) => {
        setSelectedAlbum(album || null);
    }, []);

    const artistList = <ArtistList {...props} title={source.title} onSelect={handleArtistSelect} />;

    const albumList = (
        <AlbumList
            title={selectedArtist ? `${selectedArtist.title}: Albums` : ''}
            className="artist-albums"
            pager={albumsPager}
            layout={source.secondaryLayout || defaultAlbumsLayout}
            onSelect={handleAlbumSelect}
            key={selectedArtist?.src}
        />
    );

    const trackList = (
        <MediaItemList
            title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
            storageId={`${source.id}/tracks`}
            className={`album-tracks ${selectedAlbum?.multiDisc ? 'multi-disc' : ''}`}
            pager={tracksPager}
            layout={albumTracksLayout}
            key={selectedAlbum?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryLayout?.view === 'none' ? (
                artistList
            ) : source.tertiaryLayout?.view === 'none' ? (
                <Splitter id="artists-albums-layout" arrange="rows">
                    {artistList}
                    {albumList}
                </Splitter>
            ) : (
                <Splitter id="artists-albums-tracks-layout" arrange="columns">
                    {artistList}
                    <Splitter id="artist-albums-tracks-layout" arrange="rows">
                        {albumList}
                        {trackList}
                    </Splitter>
                </Splitter>
            )}
        </div>
    );
}
