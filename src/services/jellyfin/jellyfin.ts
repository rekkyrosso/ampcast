import {Except, SetOptional, Writable} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import ViewType from 'types/ViewType';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import ratingStore from 'services/actions/ratingStore';
import {bestOf} from 'utils';
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
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    viewType: ViewType.Ratings,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createItemsPager({
            Filters: 'IsFavorite',
            SortBy: 'AlbumArtist,Album,SortName',
        });
    },
};

const jellyfinLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'jellyfin/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    viewType: ViewType.Ratings,

    search(): Pager<MediaAlbum> {
        return createItemsPager({
            Filters: 'IsFavorite',
            IncludeItemTypes: 'MusicAlbum',
            SortBy: 'AlbumArtist,SortName',
        });
    },
};

const jellyfinLikedArtists: MediaSource<MediaArtist> = {
    id: 'jellyfin/liked-artists',
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    viewType: ViewType.Ratings,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new JellyfinPager('Artists/AlbumArtists', {
            isFavorite: true,
            UserId: jellyfinSettings.userId,
        });
    },
};

const jellyfinRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'jellyfin/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    viewType: ViewType.RecentlyPlayed,
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
    viewType: ViewType.MostPlayed,
    layout: {
        view: 'details',
        fields: ['PlayCount', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre'],
    },

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

const jellyfinFolders: MediaSource<MediaFolderItem> = {
    id: 'jellyfin/folders',
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    defaultHidden: true,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: '',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new JellyfinPager<MediaFolderItem>(
            `Library/MediaFolders`,
            {
                IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio',
                Fields: 'AudioInfo,Genres,UserData,ParentId,Path',
                Recursive: false,
                SortBy: 'SortName',
                SortOrder: 'Ascending',
            },
            {pageSize: JellyfinPager.maxPageSize},
            root as MediaFolder
        );

        return root.pager;
    },
};

const jellyfin: MediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Jellyfin',
    url: 'https://jellyfin.org',
    roots: [
        createRoot(ItemType.Media, {title: 'Songs'}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists', secondaryLayout: playlistItemsLayout}),
    ],
    sources: [
        jellyfinLikedSongs,
        jellyfinLikedAlbums,
        jellyfinLikedArtists,
        jellyfinMostPlayed,
        jellyfinRecentlyPlayed,
        jellyfinPlaylists,
        jellyfinFolders,
    ],
    labels: {
        [Action.Like]: 'Add to Jellyfin Favorites',
        [Action.Unlike]: 'Remove from Jellyfin Favorites',
    },

    canRate,
    canStore: () => false,
    compareForRating,
    createSourceFromPin,
    getMetadata,
    lookup,
    rate,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default jellyfin;

ratingStore.addObserver(jellyfin);

function canRate<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

        case ItemType.Folder:
            return false;

        default:
            return true;
    }
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

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const rating = ratingStore.get(item);
    if (rating !== undefined) {
        return {...item, rating};
    }
    const [, , id] = item.src.split(':');
    const pager = new JellyfinPager<T>(`Users/${jellyfinSettings.userId}/Items/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    const items = await fetchFirstPage<T>(pager, {timeout: 2000});
    return bestOf(item, items[0]);
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
        id: `jellyfin/search/${props.title.toLowerCase()}`,
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
    const params: Record<string, string> = {...filters, SearchTerm: q};
    if (itemType === ItemType.Artist) {
        return new JellyfinPager(
            'Artists/AlbumArtists',
            {...params, UserId: jellyfinSettings.userId},
            options
        );
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
}

function createItemsPager<T extends MediaObject>(
    params: Record<string, string>,
    options?: Partial<PagerConfig>
): Pager<T> {
    return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, params, options);
}
