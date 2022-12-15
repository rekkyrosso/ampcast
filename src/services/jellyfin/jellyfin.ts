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
import SimplePager from 'services/pagers/SimplePager';
import JellyfinPager from './JellyfinPager';
import jellyfinSettings from './jellyfinSettings';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './jellyfinAuth';

console.log('module::jellyfin');

const serviceId: MediaServiceId = 'jellyfin';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

const jellyfinLikedSongs: MediaSource<MediaItem> = {
    id: 'jellyfin/liked-songs',
    title: 'Liked Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createItemsPager({
            Filters: 'IsFavorite',
        });
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
    icon: 'playlists',
    itemType: ItemType.Playlist,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'TrackCount'],
    },
    secondaryLayout: defaultLayout,

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
    title: 'Jellyfin',
    url: 'https://jellyfin.org/',
    lookup: createLookupPager,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs'}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists'}),
    ],
    sources: [
        jellyfinMostPlayed,
        jellyfinRecentlyPlayed,
        jellyfinLikedSongs,
        jellyfinLikedAlbums,
        jellyfinPlaylists,
    ],

    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

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

function createLookupPager(
    artist: string,
    title: string,
    options?: Partial<PagerConfig>
): Pager<MediaItem> {
    if (!artist || !title) {
        new SimplePager();
    }
    return createSearchPager(ItemType.Media, title, {Artists: artist}, options);
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
