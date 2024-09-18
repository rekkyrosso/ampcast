import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
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

const serviceId: MediaServiceId = 'tidal';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb'],
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
    get disabled(): boolean {
        return tidalSettings.disabled;
    },
    defaultHidden: true,
    get credentialsRequired(): boolean {
        return tidalSettings.credentialsRequired;
    },
    roots: [
        createRoot(ItemType.Media, {title: 'Tracks', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot<MediaItem>(ItemType.Media, {
            title: 'Videos',
            mediaType: MediaType.Video,
            layout: defaultLayout,
        }),
    ],
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

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `${serviceId}/search/${props.title.toLowerCase()}`,
        icon: 'search',
        searchable: true,

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

                        default:
                            throw TypeError('Search not supported for this type of media');
                    }
                }) as (cursor?: string) => Promise<TidalPage<T>>,
                {maxSize: 100}
            );
        },
    };
}
