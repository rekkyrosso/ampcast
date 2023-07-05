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
import DualPager from 'services/pagers/DualPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import ratingStore from 'services/actions/ratingStore';
import {bestOf} from 'utils';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './embyAuth';
import EmbyPager from './EmbyPager';
import embySettings from './embySettings';
import embyApi from './embyApi';

console.log('module::emby');

const serviceId: MediaServiceId = 'emby';

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Duration', 'Genre', 'PlayCount'],
};

const embyLikedSongs: MediaSource<MediaItem> = {
    id: 'emby/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    viewType: ViewType.Ratings,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Artist', 'Title', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsFavorite',
            SortBy: 'AlbumArtist,Album,SortName',
        });
    },
};

const embyLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'emby/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    viewType: ViewType.Ratings,

    search(): Pager<MediaAlbum> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsFavorite',
            IncludeItemTypes: 'MusicAlbum',
            SortBy: 'AlbumArtist,SortName',
        });
    },
};

const embyLikedArtists: MediaSource<MediaArtist> = {
    id: 'emby/liked-artists',
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    viewType: ViewType.Ratings,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new EmbyPager('Artists/AlbumArtists', {
            ParentId: getMusicLibraryId(),
            isFavorite: true,
            UserId: embySettings.userId,
        });
    },
};

const embyRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'emby/recently-played',
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
            ParentId: getMusicLibraryId(),
            SortBy: 'DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const embyMostPlayed: MediaSource<MediaItem> = {
    id: 'emby/most-played',
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
            ParentId: getMusicLibraryId(),
            SortBy: 'PlayCount,DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const embyPlaylists: MediaSource<MediaPlaylist> = {
    id: 'emby/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IncludeItemTypes: 'Playlist',
        });
    },
};

const embyMusicVideos: MediaSource<MediaItem> = {
    id: 'emby/videos',
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
    searchable: true,
    defaultHidden: true,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Artist', 'Title', 'Year', 'Duration'],
    },

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        const musicVideoLibrary = embySettings.libraries.find(
            (library) => library.type === 'musicvideos'
        );
        if (!musicVideoLibrary) {
            throw Error('No music video library');
        }
        return createItemsPager({
            ParentId: musicVideoLibrary.id,
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IncludeItemTypes: 'MusicVideo',
            SearchTerm: q,
        });
    },
};

const embyFolders: MediaSource<MediaFolderItem> = {
    id: 'emby/folders',
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

        root.pager = new SimpleMediaPager<MediaFolderItem>(() =>
            embySettings.libraries.map(({id, title}) => {
                const library: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `emby:folder:${id}`,
                    title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager([parentFolder]);
                const folderPager = new EmbyPager<MediaFolderItem>(
                    `Users/${embySettings.userId}/Items`,
                    {
                        ParentId: id,
                        IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio,MusicVideo',
                        Fields: 'AudioInfo,Genres,UserData,ParentId,Path,PresentationUniqueKey',
                        EnableUserData: true,
                        Recursive: false,
                        SortBy: 'IsFolder,IndexNumber,FileName',
                        SortOrder: 'Ascending',
                    },
                    undefined,
                    library as MediaFolder
                );

                library.pager = new DualPager<MediaFolderItem>(backPager, folderPager);

                return library as MediaFolder;
            })
        );

        return root.pager;
    },
};

const emby: MediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Emby',
    url: 'https://emby.media/',
    defaultHidden: true,
    get libraryId(): string {
        return embySettings.libraryId;
    },
    roots: [
        createRoot(ItemType.Media, {title: 'Songs'}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists', secondaryLayout: playlistItemsLayout}),
    ],
    sources: [
        embyLikedSongs,
        embyLikedAlbums,
        embyLikedArtists,
        embyMostPlayed,
        embyRecentlyPlayed,
        embyPlaylists,
        embyMusicVideos,
        embyFolders,
    ],
    labels: {
        [Action.Like]: 'Add to Emby Favorites',
        [Action.Unlike]: 'Remove from Emby Favorites',
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

export default emby;

ratingStore.addObserver(emby);

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
    const pager = new EmbyPager<T>(`Users/${embySettings.userId}/Items/${id}`, undefined, {
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
    const path = `Users/${embySettings.userId}/FavoriteItems/${id}`;
    if (rating) {
        await embyApi.post(path);
    } else {
        await embyApi.delete(path);
    }
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `emby/search/${props.title.toLowerCase()}`,
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
    const params: Record<string, string> = {
        ParentId: getMusicLibraryId(),
        SortBy: 'SortName',
        SearchTerm: q,
        ...filters,
    };
    if (itemType === ItemType.Artist) {
        return new EmbyPager('Artists', {...params, UserId: embySettings.userId}, options);
    } else {
        switch (itemType) {
            case ItemType.Media:
                params.IncludeItemTypes = 'Audio';
                params.SortBy = 'AlbumArtist,Album,IndexNumber,SortName';
                break;

            case ItemType.Album:
                params.IncludeItemTypes = 'MusicAlbum';
                params.SortBy = 'AlbumArtist,SortName';
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
    return new EmbyPager(`Users/${embySettings.userId}/Items`, params, options);
}

function getMusicLibraryId(): string {
    const libraryId = embySettings.libraryId;
    if (!libraryId) {
        throw Error('No music library');
    }
    return libraryId;
}
