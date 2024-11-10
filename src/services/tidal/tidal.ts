import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import SimplePager from 'services/pagers/SimplePager';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './tidalAuth';
import TidalPager, {TidalPage} from './TidalPager';
import tidalApi from './tidalApi';
import tidalSettings from './tidalSettings';
import Credentials from './components/TidalCredentials';
import Login from './components/TidalLogin';
import './bootstrap';

const serviceId: MediaServiceId = 'tidal';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb'],
};

const tidalSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {title: 'Tracks', layout: defaultLayout}),
        createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
        createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
        createSearch<MediaPlaylist>(ItemType.Playlist, {title: 'Playlists'}),
        createSearch<MediaItem>(ItemType.Media, {
            title: 'Videos',
            mediaType: MediaType.Video,
            layout: defaultLayout,
        }),
    ],
};

const tidalPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'My Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    lockActionsStore: true,
    layout: playlistLayout,

    search(): Pager<MediaPlaylist> {
        return new TidalPager((cursor) => tidalApi.getMyPlaylists(cursor));
    },
};

const tidalDailyDiscovery: MediaSource<MediaItem> = {
    id: `${serviceId}/daily-discovery`,
    title: 'Daily Discovery',
    icon: 'playlist',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new TidalPager((cursor) => tidalApi.getDailyDiscovery(cursor));
    },
};

const tidalMyMixes: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/my-mixes`,
    title: 'My Mixes',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,

    search(): Pager<MediaPlaylist> {
        return new TidalPager(() => tidalApi.getMyMixes());
    },
};

const tidalNewArrivals: MediaSource<MediaItem> = {
    id: `${serviceId}/new-arrivals`,
    title: 'New Arrivals',
    icon: 'playlist',
    itemType: ItemType.Media,
    layout: defaultLayout,

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
    get disabled(): boolean {
        return tidalSettings.disabled;
    },
    defaultHidden: true,
    internetRequired: true,
    get credentialsRequired(): boolean {
        return tidalSettings.credentialsRequired;
    },
    root: tidalSearch,
    sources: [tidalPlaylists, tidalMyMixes, tidalDailyDiscovery, tidalNewArrivals],
    canRate: () => false,
    canStore: () => false,
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
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: props.title,
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
