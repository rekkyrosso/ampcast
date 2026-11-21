import React, {useState} from 'react';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import Pager from 'types/Pager';
import ArtistList from 'components/MediaList/ArtistList';
import MediaItemList from 'components/MediaList/MediaItemList';
import MediaObjectBrowser from 'components/MediaObjectBrowser';
import Splitter from 'components/Splitter';
import {PagedItemsProps} from './PagedItems';

export default function ArtistsTracks({service, source, ...props}: PagedItemsProps<MediaArtist>) {
    const [[selectedArtist], setSelectedArtist] = useState<readonly MediaArtist[]>([]);
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

    const trackList = (
        <MediaItemList
            title={selectedArtist ? `${selectedArtist.title}: Tracks` : ''}
            className="artist-tracks"
            parent={selectedArtist}
            pager={(selectedArtist?.pager as Pager<MediaItem>) || null}
            source={source}
            level={2}
            key={selectedArtist?.src}
        />
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
                    {trackList}
                </MediaObjectBrowser>
            ) : source.secondaryItems?.layout?.view === 'none' ? (
                artistList
            ) : (
                <Splitter id="two-panel-layout" arrange="rows">
                    {artistList}
                    {trackList}
                </Splitter>
            )}
        </div>
    );
}
