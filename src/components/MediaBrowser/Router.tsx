import React, {useEffect} from 'react';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import ViewType from 'types/ViewType';
import actionsStore from 'services/actions/actionsStore';
import LastFmHistoryBrowser from 'services/lastfm/components/LastFmHistoryBrowser';
import LastFmRecentlyPlayedBrowser from 'services/lastfm/components/LastFmRecentlyPlayedBrowser';
import LastFmTopBrowser from 'services/lastfm/components/LastFmTopBrowser';
import ListenBrainzHistoryBrowser from 'services/listenbrainz/components/ListenBrainzHistoryBrowser';
import ListenBrainzRecentlyPlayedBrowser from 'services/listenbrainz/components/ListenBrainzRecentlyPlayedBrowser';
import ListenBrainzTopBrowser from 'services/listenbrainz/components/ListenBrainzTopBrowser';
import DefaultBrowser from './DefaultBrowser';
import FilteredBrowser from './FilteredBrowser';
import FolderBrowser from './FolderBrowser';
import {MediaBrowserProps} from './MediaBrowser';

export default function Router<T extends MediaObject>({service, sources}: MediaBrowserProps<T>) {
    const source = sources.length === 1 ? sources[0] : null;

    useEffect(() => {
        if (source?.lockActionsStore) {
            actionsStore.lock(service.id, source.itemType);
        } else {
            actionsStore.unlock();
        }
    }, [service, source]);

    useEffect(() => {
        return () => actionsStore.unlock(); // Teardown
    }, [service]);

    switch (source?.id) {
        case 'lastfm/top/tracks':
        case 'lastfm/top/albums':
        case 'lastfm/top/artists':
            return <LastFmTopBrowser service={service} source={source} />;

        case 'listenbrainz/top/tracks':
        case 'listenbrainz/top/albums':
        case 'listenbrainz/top/artists':
            return <ListenBrainzTopBrowser service={service} source={source} />;

        case 'lastfm/history':
            return (
                <LastFmHistoryBrowser service={service} source={source as MediaSource<MediaItem>} />
            );

        case 'listenbrainz/history':
            return (
                <ListenBrainzHistoryBrowser
                    service={service}
                    source={source as MediaSource<MediaItem>}
                />
            );

        case 'lastfm/recently-played':
            return (
                <LastFmRecentlyPlayedBrowser
                    service={service}
                    source={source as MediaSource<MediaItem>}
                />
            );

        case 'listenbrainz/recently-played':
            return (
                <ListenBrainzRecentlyPlayedBrowser
                    service={service}
                    source={source as MediaSource<MediaItem>}
                />
            );

        default:
            switch (source?.viewType) {
                case ViewType.ByDecade:
                case ViewType.ByGenre:
                    return <FilteredBrowser service={service} source={source} />;

                case ViewType.Folders:
                    return (
                        <FolderBrowser
                            service={service}
                            source={source as MediaSource<MediaFolderItem>}
                        />
                    );

                default:
                    return <DefaultBrowser service={service} sources={sources} />;
            }
    }
}
