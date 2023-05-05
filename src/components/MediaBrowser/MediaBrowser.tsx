import React, {useEffect, useState} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import ViewType from 'types/ViewType';
import Login from 'components/Login';
import SearchBar from 'components/SearchBar';
import {MediaListProps} from 'components/MediaList';
import libraryStore from 'services/actions/libraryStore';
import ratingStore from 'services/actions/ratingStore';
import AppleMusicVideo from 'services/apple/components/AppleMusicVideo';
import LastFmHistoryBrowser from 'services/lastfm/components/LastFmHistoryBrowser';
import LastFmRecentlyPlayedBrowser from 'services/lastfm/components/LastFmRecentlyPlayedBrowser';
import LastFmTopBrowser from 'services/lastfm/components/LastFmTopBrowser';
import ListenBrainzHistoryBrowser from 'services/listenbrainz/components/ListenBrainzHistoryBrowser';
import ListenBrainzRecentlyPlayedBrowser from 'services/listenbrainz/components/ListenBrainzRecentlyPlayedBrowser';
import ListenBrainzTopBrowser from 'services/listenbrainz/components/ListenBrainzTopBrowser';
import useObservable from 'hooks/useObservable';
import useSearch from 'hooks/useSearch';
import './MediaBrowser.scss';
import AlbumBrowser from './AlbumBrowser';
import ArtistBrowser from './ArtistBrowser';
import FolderItemBrowser from './FolderItemBrowser';
import MediaItemBrowser from './MediaItemBrowser';
import MediaSourceSelector from './MediaSourceSelector';
import PageHeader from './PageHeader';
import PlaylistBrowser from './PlaylistBrowser';
import PinnedPlaylistBrowser from './PinnedPlaylistBrowser';
import useErrorScreen from './useErrorScreen';

export interface MediaBrowserProps<T extends MediaObject> {
    service: MediaService;
    sources: readonly MediaSource<T>[];
}

export default function MediaBrowser<T extends MediaObject>({
    service,
    sources,
}: MediaBrowserProps<T>) {
    const isLoggedIn = useObservable(service.observeIsLoggedIn, false);
    const renderError = useErrorScreen(service);
    const key = `${service.id}/${sources.map((source) => source.id)}`;

    return (
        <div className={`media-browser ${service.id}-browser`} key={key}>
            {isLoggedIn ? (
                <ErrorBoundary fallbackRender={renderError}>
                    <Router service={service} sources={sources} />
                </ErrorBoundary>
            ) : (
                <Login service={service} />
            )}
        </div>
    );
}

function Router<T extends MediaObject>({service, sources}: MediaBrowserProps<T>) {
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
        return () => {
            libraryStore.unlock();
            ratingStore.unlock();
        };
    }, [service]);

    switch (source?.id) {
        case 'lastfm/top/tracks':
        case 'lastfm/top/albums':
        case 'lastfm/top/artists':
            return <LastFmTopBrowser source={source!} />;

        case 'listenbrainz/top/tracks':
        case 'listenbrainz/top/albums':
        case 'listenbrainz/top/artists':
            return <ListenBrainzTopBrowser source={source!} />;

        case 'lastfm/history':
            return <LastFmHistoryBrowser />;

        case 'listenbrainz/history':
            return <ListenBrainzHistoryBrowser />;

        case 'lastfm/recently-played':
            return <LastFmRecentlyPlayedBrowser />;

        case 'listenbrainz/recently-played':
            return <ListenBrainzRecentlyPlayedBrowser />;

        case 'jellyfin/folders':
        case 'plex/folders':
            return (
                <FolderItemBrowser
                    service={service}
                    source={source as MediaSource<MediaFolderItem>}
                />
            );

        default:
            return <DefaultBrowser service={service} sources={sources} />;
    }
}

export function DefaultBrowser<T extends MediaObject>({service, sources}: MediaBrowserProps<T>) {
    const [source, setSource] = useState<MediaSource<T>>(() => sources[0]);
    const [query, setQuery] = useState('');
    const pager = useSearch(source, query);
    const searchable = !!source.searchable;
    const showPagerHeader = !searchable && !source.isPin;

    return (
        <>
            {showPagerHeader ? (
                <PageHeader icon={service.icon}>
                    {service.name}: {source.title}
                </PageHeader>
            ) : null}
            {searchable ? (
                <SearchBar
                    icon={service.icon}
                    placeholder={`Search ${service.name}`}
                    onSubmit={setQuery}
                />
            ) : null}
            {sources.length > 1 ? (
                <MediaSourceSelector sources={sources} onSourceChange={setSource} />
            ) : null}
            <PagedBrowser
                className={searchable ? 'search-browser' : ''}
                source={source}
                pager={pager}
                layout={source.layout}
                loadingText={query ? 'Searching' : undefined}
            />
        </>
    );
}

export interface PagedBrowserProps<T extends MediaObject> extends Except<MediaListProps<T>, 'title'> {
    source: MediaSource<T>;
}

export function PagedBrowser<T extends MediaObject>(props: PagedBrowserProps<T>) {
    switch (props.source.itemType) {
        case ItemType.Artist:
            return <ArtistBrowser {...(props as unknown as PagedBrowserProps<MediaArtist>)} />;

        case ItemType.Album:
            return <AlbumBrowser {...(props as unknown as PagedBrowserProps<MediaAlbum>)} />;

        case ItemType.Playlist:
            if (props.source.isPin) {
                return (
                    <PinnedPlaylistBrowser
                        {...(props as unknown as PagedBrowserProps<MediaPlaylist>)}
                    />
                );
            } else {
                return (
                    <PlaylistBrowser {...(props as unknown as PagedBrowserProps<MediaPlaylist>)} />
                );
            }

        default:
            switch (props.source.id) {
                case 'apple/search/videos':
                case 'apple/library-videos':
                    return (
                        <AppleMusicVideo {...(props as unknown as PagedBrowserProps<MediaItem>)} />
                    );

                default:
                    return (
                        <MediaItemBrowser {...(props as unknown as PagedBrowserProps<MediaItem>)} />
                    );
            }
    }
}
