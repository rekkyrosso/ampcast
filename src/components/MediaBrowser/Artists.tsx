import React, {useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItemList from 'components/MediaList/MediaItemList';
import AlbumList from 'components/MediaList/AlbumList';
import ArtistList from 'components/MediaList/ArtistList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';
import useAlbumTracksLayout from './useAlbumTracksLayout';

export default function Artists({source, ...props}: PagedItemsProps<MediaArtist>) {
    const [[selectedArtist], setSelectedArtist] = useState<readonly MediaArtist[]>([]);
    const [[selectedAlbum], setSelectedAlbum] = useState<readonly MediaAlbum[]>([]);
    const albumTracksLayout = useAlbumTracksLayout(selectedAlbum);
    const albumsPager = selectedArtist?.pager || null;
    const tracksPager = selectedAlbum?.pager || null;

    const artistList = (
        <ArtistList
            {...props}
            title={source.title}
            layoutOptions={source.primaryItems?.layout}
            source={source}
            level={1}
            onSelect={setSelectedArtist}
        />
    );

    const albumList = (
        <AlbumList
            title={selectedArtist ? `${selectedArtist.title}: Albums` : ''}
            className="artist-albums"
            pager={albumsPager}
            layoutOptions={source.secondaryItems?.layout}
            source={source}
            level={2}
            onSelect={setSelectedAlbum}
            key={selectedArtist?.src}
        />
    );

    const trackList = (
        <MediaItemList
            title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
            className={`album-tracks ${selectedAlbum?.multiDisc ? 'multi-disc' : ''}`}
            pager={tracksPager}
            defaultLayout={albumTracksLayout}
            layoutOptions={source.tertiaryItems?.layout}
            source={source}
            level={3}
            key={selectedAlbum?.src}
        />
    );

    return (
        <div className="panel">
            {source.secondaryItems?.layout?.view === 'none' ? (
                artistList
            ) : source.tertiaryItems?.layout?.view === 'none' ? (
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
