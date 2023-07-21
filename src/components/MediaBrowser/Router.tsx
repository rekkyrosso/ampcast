import React, {useEffect} from 'react';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import ViewType from 'types/ViewType';
import libraryStore from 'services/actions/libraryStore';
import ratingStore from 'services/actions/ratingStore';
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
        if (source?.viewType === ViewType.Library) {
            libraryStore.lock(service.id, source.itemType);
        } else {
            libraryStore.unlock();
        }
    }, [service, source]);

    useEffect(() => {
        if (source?.viewType === ViewType.Ratings) {
            ratingStore.lock(service.id, source.itemType);
        } else {
            ratingStore.unlock();
        }
    }, [service, source]);

    useEffect(() => {
        // Teardown
        return () => {
            libraryStore.unlock();
            ratingStore.unlock();
        };
    }, [service]);

    switch (source?.id) {
        case 'lastfm/top/tracks':
        case 'lastfm/top/albums':
        case 'lastfm/top/artists':
            return <LastFmTopBrowser source={source} />;

        case 'listenbrainz/top/tracks':
        case 'listenbrainz/top/albums':
        case 'listenbrainz/top/artists':
            return <ListenBrainzTopBrowser source={source} />;

        case 'lastfm/history':
            return <LastFmHistoryBrowser />;

        case 'listenbrainz/history':
            return <ListenBrainzHistoryBrowser />;

        case 'lastfm/recently-played':
            return <LastFmRecentlyPlayedBrowser />;

        case 'listenbrainz/recently-played':
            return <ListenBrainzRecentlyPlayedBrowser />;

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
