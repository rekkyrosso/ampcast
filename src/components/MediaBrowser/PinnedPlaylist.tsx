import React, {useCallback, useEffect, useState} from 'react';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSourceLayout from 'types/MediaSourceLayout';
import pinStore from 'services/pins/pinStore';
import Icon from 'components/Icon';
import {ErrorBoxProps} from 'components/Errors/ErrorBox';
import MediaItemList from 'components/MediaList/MediaItemList';
import PlaylistList from 'components/MediaList/PlaylistList';
import {PagedItemsProps} from './PagedItems';
import './PinnedPlaylist.scss';

const defaultLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card',
    fields: ['Thumbnail', 'PlaylistTitle', 'TrackCount', 'Owner'],
};

const defaultPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const chartPlaylistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Index', 'Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

export default function PinnedPlaylist({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [error, setError] = useState<unknown>();
    const [selectedPlaylist, setSelectedPlaylist] = useState<MediaPlaylist | null>(null);
    const itemsPager = selectedPlaylist?.pager || null;
    const defaultSecondaryLayout = selectedPlaylist?.isChart
        ? chartPlaylistItemsLayout
        : defaultPlaylistItemsLayout;

    useEffect(() => {
        // Teardown
        return () => pinStore.unlock();
    }, [source]);

    useEffect(() => {
        if (selectedPlaylist) {
            pinStore.lock(selectedPlaylist);
        }
    }, [selectedPlaylist]);

    const handleSelect = useCallback(([item]: readonly MediaPlaylist[]) => {
        setSelectedPlaylist(item || null);
    }, []);

    return (
        <div className="panel pinned-playlist">
            {error ? (
                <PinnedPlaylistError error={error} reportingId={source.id} />
            ) : (
                <PlaylistList
                    {...props}
                    title={source.title}
                    layout={source.layout || defaultLayout}
                    onError={setError}
                    onSelect={handleSelect}
                    statusBar={false}
                    disabled
                />
            )}
            <MediaItemList
                title={`${source.title}: Tracks`}
                className="playlist-items"
                pager={itemsPager}
                layout={source.secondaryLayout || defaultSecondaryLayout}
                emptyMessage="Empty playlist"
                onError={setError}
                reportingId={`${source.id}/items`}
            />
        </div>
    );
}

function PinnedPlaylistError({reportingId: src}: ErrorBoxProps) {
    const unpin = useCallback(() => {
        if (src) {
            pinStore.unlock();
            pinStore.unpin({src});
        }
    }, [src]);

    return (
        <div className="panel playlists error-box">
            <p className="message">
                <Icon name="error" />
                <span className="text">Failed to load playlist</span>
            </p>
            <p className="buttons">
                <button onClick={unpin}>Unpin</button>
            </p>
        </div>
    );
}
