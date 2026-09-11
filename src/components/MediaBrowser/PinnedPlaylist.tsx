import React, {useCallback, useEffect, useRef, useState} from 'react';
import MediaListLayout from 'types/MediaListLayout';
import MediaPlaylist from 'types/MediaPlaylist';
import pinStore from 'services/pins/pinStore';
import Button from 'components/Button';
import Icon from 'components/Icon';
import {ErrorBoxProps} from 'components/Errors/ErrorBox';
import {defaultMediaItemCard, playlistItemsLayout} from 'components/MediaList/layouts';
import PlaylistList from 'components/MediaList/PlaylistList';
import PlaylistItemsList from 'components/MediaList/PlaylistItemsList';
import {PagedItemsProps} from './PagedItems';
import './PinnedPlaylist.scss';

const defaultLayout: MediaListLayout = {
    view: 'card',
    card: {
        h1: 'IconTitle',
        h2: 'Owner',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['IconTitle', 'Owner', 'TrackCount', 'Progress'],
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
    const ref = useRef<HTMLDivElement | null>(null);
    const [error, setError] = useState<unknown>();
    const [[pinnedPlaylist], setPinnedPlaylist] = useState<readonly MediaPlaylist[]>([]);
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
        <div className="panel pinned-playlist" ref={ref}>
            {error ? (
                <PinnedPlaylistError error={error} reportingId={source.id} />
            ) : (
                <PlaylistList
                    {...props}
                    title={source.title}
                    defaultLayout={defaultLayout}
                    source={source}
                    level={1}
                    onError={setError}
                    onSelect={setPinnedPlaylist}
                />
            )}
            <PlaylistItemsList
                title={`${source.title}: Tracks`}
                parent={pinnedPlaylist}
                defaultLayout={defaultItemsLayout}
                source={source}
                level={2}
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
                <Button onClick={unpin}>Unpin</Button>
            </p>
        </div>
    );
}
