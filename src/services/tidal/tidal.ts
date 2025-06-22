import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {isStartupService} from 'services/buildConfig';
import SimplePager from 'services/pagers/SimplePager';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './tidalAuth';
import TidalPager, {TidalPage} from './TidalPager';
import tidalApi from './tidalApi';
import tidalSettings from './tidalSettings';
import Credentials from './components/TidalCredentials';
import Login from './components/TidalLogin';
import './bootstrap';

const serviceId: MediaServiceId = 'tidal';

const tidalSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {
            id: 'tracks',
            title: 'Tracks',
        }),
        createSearch<MediaAlbum>(ItemType.Album, {
            id: 'albums',
            title: 'Albums',
        }),
        createSearch<MediaArtist>(ItemType.Artist, {
            id: 'artists',
            title: 'Artists',
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
        }),
        createSearch<MediaItem>(ItemType.Media, {
            id: 'videos',
            title: 'Videos',
            mediaType: MediaType.Video,
        }),
    ],
};

const tidalPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'My Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    lockActionsStore: true,

    search(): Pager<MediaPlaylist> {
        return new TidalPager((cursor) => tidalApi.getMyPlaylists(cursor));
    },
};

const tidalDailyDiscovery: MediaSource<MediaItem> = {
    id: `${serviceId}/daily-discovery`,
    title: 'Daily Discovery',
    icon: 'playlist',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new TidalPager((cursor) => tidalApi.getDailyDiscovery(cursor));
    },
};

const tidalMyMixes: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/my-mixes`,
    title: 'My Mixes',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new TidalPager(() => tidalApi.getMyMixes());
    },
};

const tidalNewArrivals: MediaSource<MediaItem> = {
    id: `${serviceId}/new-arrivals`,
    title: 'New Arrivals',
    icon: 'playlist',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new TidalPager((cursor) => tidalApi.getNewArrivals(cursor));
    },
};

const tidal: PublicMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'TIDAL',
    url: 'https://listen.tidal.com',
    credentialsUrl: 'https://developer.tidal.com/dashboard',
    serviceType: ServiceType.PublicMedia,
    Components: {Credentials, Login},
    defaultHidden: !isStartupService(serviceId),
    internetRequired: true,
    get credentialsLocked(): boolean {
        return tidalSettings.credentialsLocked;
    },
    credentialsRequired: true,
    root: tidalSearch,
    sources: [tidalPlaylists, tidalMyMixes, tidalDailyDiscovery, tidalNewArrivals],
    compareForRating,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default tidal;

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `${serviceId}/search/${props.id}`,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            if (!q) {
                return new SimplePager<T>();
            }
            return new TidalPager<T>(
                ((cursor) => {
                    switch (itemType) {
                        case ItemType.Media:
                            if (props.mediaType === MediaType.Video) {
                                return tidalApi.searchVideos(q, cursor);
                            } else {
                                return tidalApi.searchTracks(q, cursor);
                            }

                        case ItemType.Album:
                            return tidalApi.searchAlbums(q, cursor);

                        case ItemType.Artist:
                            return tidalApi.searchArtists(q, cursor);

                        case ItemType.Playlist:
                            return tidalApi.searchPlaylists(q, cursor);

                        default:
                            throw TypeError('Search not supported for this type of media');
                    }
                }) as (cursor?: string) => Promise<TidalPage<T>>,
                {maxSize: 100}
            );
        },
    };
}
