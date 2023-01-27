import React, {useState} from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Login from 'components/Login';
import SearchBar from 'components/SearchBar';
import {MediaListProps} from 'components/MediaList';
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
import MediaItemBrowser from './MediaItemBrowser';
import MediaSourceSelector from './MediaSourceSelector';
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

    switch (source?.id) {
        case 'apple/video':
            return <AppleMusicVideo />;

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

        default:
            return <DefaultBrowser service={service} sources={sources} />;
    }
}

export function DefaultBrowser<T extends MediaObject>({sources}: MediaBrowserProps<T>) {
    const [source, setSource] = useState<MediaSource<T>>(() => sources[0]);
    const [query, setQuery] = useState('');
    const pager = useSearch(source, query);
    const searchable = !!source.searchable;

    return (
        <>
            {searchable && <SearchBar onSubmit={setQuery} />}
            {sources.length > 1 ? (
                <MediaSourceSelector sources={sources} onSourceChange={setSource} />
            ) : null}
            <PagedBrowser
                source={source}
                pager={pager}
                layout={source.layout}
                loadingText={query ? 'Searching' : undefined}
            />
        </>
    );
}

export interface PagedBrowserProps<T extends MediaObject> extends MediaListProps<T> {
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
            return <MediaItemBrowser {...(props as unknown as PagedBrowserProps<MediaItem>)} />;
    }
}
