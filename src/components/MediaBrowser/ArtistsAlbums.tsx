import React, {useState} from 'react';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import Pager from 'types/Pager';
import MediaItemList from 'components/MediaList/MediaItemList';
import MediaObjectBrowser from 'components/MediaObjectBrowser';
import {albumTracksLayout} from 'components/MediaList/layouts';
import AlbumList from 'components/MediaList/AlbumList';
import ArtistList from 'components/MediaList/ArtistList';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';

export default function ArtistsAlbums({service, source, ...props}: PagedItemsProps<MediaArtist>) {
    const [[selectedArtist], setSelectedArtist] = useState<readonly MediaArtist[]>([]);
    const [[selectedAlbum], setSelectedAlbum] = useState<readonly MediaAlbum[]>([]);
    const [error, setError] = useState<unknown>();

    const artistList = (
        <ArtistList
            {...props}
            title={source.title}
            source={source}
            level={1}
            onError={setError}
            onSelect={setSelectedArtist}
        />
    );

    const albumList = (
        <AlbumList
            title={selectedArtist ? `${selectedArtist.title}: Albums` : ''}
            className="artist-albums"
            pager={(selectedArtist?.pager as Pager<MediaAlbum>) || null}
            source={source}
            level={2}
            onSelect={setSelectedAlbum}
            key={selectedArtist?.src}
        />
    );

    const trackList = (
        <MediaItemList
            title={selectedAlbum ? `${selectedAlbum.title}: Tracks` : ''}
            className={`album-tracks ${selectedAlbum?.synthetic ? 'synthetic' : ''} ${selectedAlbum?.multiDisc ? 'multi-disc' : ''}`}
            parent={selectedAlbum}
            pager={selectedAlbum?.pager || null}
            source={source}
            defaultLayout={albumTracksLayout}
            level={3}
            key={selectedAlbum?.src}
        />
    );

    const albumsAndTracks = (
        <Splitter id="two-panel-layout" arrange="rows">
            {albumList}
            {trackList}
        </Splitter>
    );

    return (
        <div className="panel">
            {source.singular ? (
                <MediaObjectBrowser
                    service={service}
                    source={source}
                    item={selectedArtist}
                    itemList={artistList}
                    error={error}
                >
                    {albumsAndTracks}
                </MediaObjectBrowser>
            ) : source.secondaryItems?.layout?.view === 'none' ? (
                artistList
            ) : source.tertiaryItems?.layout?.view === 'none' ? (
                <Splitter id="two-panel-layout" arrange="rows">
                    {artistList}
                    {albumList}
                </Splitter>
            ) : (
                <Splitter id="three-panel-layout" arrange="columns">
                    {artistList}
                    {albumsAndTracks}
                </Splitter>
            )}
        </div>
    );
}
