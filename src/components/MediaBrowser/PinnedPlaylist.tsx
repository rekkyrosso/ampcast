import React, {useCallback, useEffect, useState} from 'react';
import MediaListLayout from 'types/MediaListLayout';
import MediaPlaylist from 'types/MediaPlaylist';
import pinStore from 'services/pins/pinStore';
import Icon from 'components/Icon';
import {ErrorBoxProps} from 'components/Errors/ErrorBox';
import MediaItemList from 'components/MediaList/MediaItemList';
import {defaultMediaItemCard, playlistItemsLayout} from 'components/MediaList/layouts';
import PlaylistList from 'components/MediaList/PlaylistList';
import {PagedItemsProps} from './PagedItems';
import './PinnedPlaylist.scss';

const defaultLayout: MediaListLayout = {
    view: 'card',
    card: {
        h1: 'PinTitle',
        h2: 'Owner',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['PinTitle', 'Owner', 'TrackCount', 'Progress'],
};

const defaultPlaylistItemsLayout: MediaListLayout = {
    ...playlistItemsLayout,
    view: 'card compact',
};

const chartPlaylistItemsLayout: MediaListLayout = {
    ...defaultPlaylistItemsLayout,
    card: {
        ...defaultMediaItemCard,
        index: 'Index',
    },
};

export default function PinnedPlaylist({source, ...props}: PagedItemsProps<MediaPlaylist>) {
    const [error, setError] = useState<unknown>();
    const [[pinnedPlaylist], setPinnedPlaylist] = useState<readonly MediaPlaylist[]>([]);
    const itemsPager = pinnedPlaylist?.pager || null;
    const defaultItemsLayout = pinnedPlaylist?.isChart
        ? chartPlaylistItemsLayout
        : defaultPlaylistItemsLayout;

    useEffect(() => {
        // Teardown
        return () => pinStore.unlock();
    }, [source]);

    useEffect(() => {
        if (pinnedPlaylist) {
            pinStore.lock(pinnedPlaylist);
        }
    }, [pinnedPlaylist]);

    return (
        <div className="panel pinned-playlist">
            {error ? (
                <PinnedPlaylistError error={error} reportingId={source.id} />
            ) : (
                <PlaylistList
                    {...props}
                    title={source.title}
                    defaultLayout={defaultLayout}
                    layoutOptions={source.primaryItems?.layout}
                    sourceId={source.id}
                    level={1}
                    onError={setError}
                    onSelect={setPinnedPlaylist}
                    statusBar={false}
                    disabled
                />
            )}
            <MediaItemList
                title={`${source.title}: Tracks`}
                className="playlist-items"
                pager={itemsPager}
                defaultLayout={defaultItemsLayout}
                layoutOptions={source.secondaryItems?.layout}
                sourceId={source.id}
                level={2}
                emptyMessage="Empty playlist"
                onError={setError}
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
