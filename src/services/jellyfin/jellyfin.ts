import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import {Pin} from 'types/Pin';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import jellyfinApi from './jellyfinApi';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './jellyfinAuth';
import JellyfinPager from './JellyfinPager';
import jellyfinSettings from './jellyfinSettings';

console.log('module::jellyfin');

const serviceId: MediaServiceId = 'jellyfin';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
};

const jellyfinLikedSongs: MediaSource<MediaItem> = {
    id: 'jellyfin/liked-songs',
    title: 'Liked Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createItemsPager({Filters: 'IsFavorite'});
    },
};

const jellyfinLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'jellyfin/liked-albums',
    title: 'Liked Albums',
    icon: 'heart',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return createItemsPager({
            Filters: 'IsFavorite',
            IncludeItemTypes: 'MusicAlbum',
        });
    },
};

const jellyfinRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'jellyfin/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return createItemsPager({
            SortBy: 'DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const jellyfinMostPlayed: MediaSource<MediaItem> = {
    id: 'jellyfin/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createItemsPager({
            SortBy: 'PlayCount,DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const jellyfinPlaylists: MediaSource<MediaPlaylist> = {
    id: 'jellyfin/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return createItemsPager({
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IncludeItemTypes: 'Playlist',
        });
    },
};

const jellyfin: MediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Jellyfin',
    url: 'https://jellyfin.org/',
    roots: [
        createRoot(ItemType.Media, {title: 'Songs'}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists', secondaryLayout: playlistItemsLayout}),
    ],
    sources: [
        jellyfinMostPlayed,
        jellyfinRecentlyPlayed,
        jellyfinLikedSongs,
        jellyfinLikedAlbums,
        jellyfinPlaylists,
    ],

    canRate,
    canStore: () => false,
    compareForRating,
    createSourceFromPin,
    lookup,
    rate,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

function canRate<T extends MediaObject>(item: T): boolean {
    return item.itemType === ItemType.Album ? !item.synthetic : true;
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const [, , id] = pin.src.split(':');
            return createItemsPager({
                ids: id,
                IncludeItemTypes: 'Playlist',
            });
        },
    };
}

async function lookup(
    artist: string,
    title: string,
    limit = 10,
    timeout?: number
): Promise<readonly MediaItem[]> {
    if (!artist || !title) {
        return [];
    }
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, lookup: true};
    const pager = createSearchPager<MediaItem>(ItemType.Media, title, {Artists: artist}, options);
    return fetchFirstPage(pager, {timeout});
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    const [, , id] = item.src.split(':');
    const path = `Users/${jellyfinSettings.userId}/FavoriteItems/${id}`;
    if (rating) {
        jellyfinApi.post(path);
    } else {
        jellyfinApi.delete(path);
    }
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: String(itemType),
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q);
        },
    };
}

function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    filters?: Record<string, string>,
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        const params: Record<string, string> = {...filters, SearchTerm: q};
        if (itemType === ItemType.Artist) {
            return new JellyfinPager('Artists', params, options);
        } else {
            switch (itemType) {
                case ItemType.Media:
                    params.IncludeItemTypes = 'Audio';
                    break;

                case ItemType.Album:
                    params.IncludeItemTypes = 'MusicAlbum';
                    break;

                case ItemType.Playlist:
                    params.IncludeItemTypes = 'Playlist';
                    break;
            }
            return createItemsPager(params, options);
        }
    } else {
        return new SimplePager<T>();
    }
}

function createItemsPager<T extends MediaObject>(
    params: Record<string, string>,
    options?: Partial<PagerConfig>
): Pager<T> {
    return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, params, options);
}

export default jellyfin;
