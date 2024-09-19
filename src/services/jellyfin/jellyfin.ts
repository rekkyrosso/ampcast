import type {Observable} from 'rxjs';
import {Except, SetOptional, Writable} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFilter from 'types/MediaFilter';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Pin from 'types/Pin';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import embyScrobbler from 'services/emby/embyScrobbler';
import {NoMusicLibraryError, NoMusicVideoLibraryError} from 'services/errors';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import {bestOf} from 'utils';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './jellyfinAuth';
import jellyfinSettings from './jellyfinSettings';
import JellyfinPager from './JellyfinPager';
import jellyfinApi from './jellyfinApi';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';

const serviceId: MediaServiceId = 'jellyfin';

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Genre'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

const jellyfinSearch: MediaMultiSource = {
    id: 'jellyfin/search',
    title: 'Search',
    icon: 'search',
    sources: [
        createSearch<MediaItem>(ItemType.Media, {title: 'Songs'}),
        createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
        createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            title: 'Playlists',
            layout: playlistLayout,
            secondaryLayout: playlistItemsLayout,
        }),
    ],
};

const jellyfinLikedSongs: MediaSource<MediaItem> = {
    id: 'jellyfin/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: {
        view: 'card',
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

const jellyfinLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'jellyfin/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
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
    lockActionsStore: true,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new JellyfinPager('Artists/AlbumArtists', {
            ParentId: getMusicLibraryId(),
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

const jellyfinMostPlayed: MediaSource<MediaItem> = {
    id: 'jellyfin/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
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

const jellyfinPlaylists: MediaSource<MediaPlaylist> = {
    id: 'jellyfin/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            SortBy: 'DateCreated,SortName',
            SortOrder: 'Descending,Ascending',
            IncludeItemTypes: 'Playlist',
        });
    },
};

const jellyfinEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: 'jellyfin/editable-playlists',
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            IncludeItemTypes: 'Playlist',
        });
    },
};

const jellyfinTracksByGenre: MediaSource<MediaItem> = {
    id: 'jellyfin/tracks-by-genre',
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    component: FilterBrowser,
    defaultHidden: true,

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                GenreIds: genre.id,
                IncludeItemTypes: 'Audio',
                SortBy: 'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName',
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: 'jellyfin/albums-by-genre',
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    component: FilterBrowser,

    search(genre?: MediaFilter): Pager<MediaAlbum> {
        if (genre) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                GenreIds: genre.id,
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'AlbumArtist,SortName',
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinArtistsByGenre: MediaSource<MediaArtist> = {
    id: 'jellyfin/artists-by-genre',
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    component: FilterBrowser,
    defaultHidden: true,

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new JellyfinPager('Artists/AlbumArtists', {
                ParentId: getMusicLibraryId(),
                GenreIds: genre.id,
                UserId: jellyfinSettings.userId,
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinTracksByDecade: MediaSource<MediaItem> = {
    id: 'jellyfin/tracks-by-decade',
    title: 'Songs by Decade',
    icon: 'calendar',
    itemType: ItemType.Media,
    filterType: FilterType.ByDecade,
    component: FilterBrowser,
    defaultHidden: true,

    search(decade?: MediaFilter): Pager<MediaItem> {
        if (decade) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Years: decade.id,
                IncludeItemTypes: 'Audio',
                SortBy: 'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName',
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: 'jellyfin/albums-by-decade',
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    filterType: FilterType.ByDecade,
    component: FilterBrowser,

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Years: decade.id,
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'AlbumArtist,SortName',
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinRandomTracks: MediaSource<MediaItem> = {
    id: 'jellyfin/random-tracks',
    title: 'Random Songs',
    icon: 'shuffle',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return createItemsPager(
            {
                ParentId: getMusicLibraryId(),
                IncludeItemTypes: 'Audio',
                SortBy: 'Random',
            },
            {maxSize: 100}
        );
    },
};

const jellyfinRandomAlbums: MediaSource<MediaAlbum> = {
    id: 'jellyfin/random-albums',
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return createItemsPager(
            {
                ParentId: getMusicLibraryId(),
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'Random',
            },
            {maxSize: 100}
        );
    },
};

const jellyfinMusicVideos: MediaSource<MediaItem> = {
    id: 'jellyfin/videos',
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    searchable: true,
    defaultHidden: true,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Artist', 'Title', 'Year', 'Duration'],
    },

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        const videoLibraryId = jellyfinSettings.videoLibraryId;
        if (!videoLibraryId) {
            throw new NoMusicVideoLibraryError();
        }
        return createItemsPager({
            ParentId: videoLibraryId,
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IncludeItemTypes: 'MusicVideo',
            SearchTerm: q,
        });
    },
};

const jellyfinFolders: MediaSource<MediaFolderItem> = {
    id: 'jellyfin/folders',
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    component: FolderBrowser,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: '',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new SimpleMediaPager<MediaFolderItem>(async () =>
            jellyfinSettings.libraries.map(({id, title}) => {
                const library: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `jellyfin:folder:${id}`,
                    title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager([parentFolder]);
                const folderPager = new JellyfinPager<MediaFolderItem>(
                    `Users/${jellyfinSettings.userId}/Items`,
                    {
                        ParentId: id,
                        IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio,MusicVideo',
                        Fields: 'AudioInfo,Genres,UserData,ParentId,Path',
                        EnableUserData: true,
                        Recursive: false,
                        SortBy: 'IsFolder,IndexNumber,SortName',
                        SortOrder: 'Ascending',
                    },
                    undefined,
                    library as MediaFolder
                );

                library.pager = new WrappedPager<MediaFolderItem>(backPager, folderPager);

                return library as MediaFolder;
            })
        );

        return root.pager;
    },
};

const jellyfin: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Jellyfin',
    url: 'https://jellyfin.org',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: true,
    root: jellyfinSearch,
    sources: [
        jellyfinLikedSongs,
        jellyfinLikedAlbums,
        jellyfinLikedArtists,
        jellyfinMostPlayed,
        jellyfinRecentlyPlayed,
        jellyfinPlaylists,
        jellyfinTracksByGenre,
        jellyfinAlbumsByGenre,
        jellyfinArtistsByGenre,
        jellyfinTracksByDecade,
        jellyfinAlbumsByDecade,
        jellyfinRandomTracks,
        jellyfinRandomAlbums,
        jellyfinMusicVideos,
        jellyfinFolders,
    ],
    labels: {
        [Action.AddToLibrary]: t('Add to Jellyfin Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Jellyfin Favorites'),
    },
    editablePlaylists: jellyfinEditablePlaylists,
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return jellyfinSettings.audioLibraries;
    },
    get host(): string {
        return jellyfinSettings.host;
    },
    get libraryId(): string {
        return jellyfinSettings.libraryId;
    },
    set libraryId(libraryId: string) {
        jellyfinSettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return jellyfinSettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        jellyfinSettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return jellyfinSettings.observeLibraryId();
    },
    addToPlaylist,
    canRate: () => false,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMetadata,
    getPlayableUrl,
    getPlaybackType,
    lookup,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default jellyfin;

function canStore<T extends MediaObject>(item: T): boolean {
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

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    const playlistId = getIdFromSrc(playlist);
    return jellyfinApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await jellyfinApi.createPlaylist(name, description, items.map(getIdFromSrc));
    return {
        src: `jellyfin:playlist:${playlist.Id}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        layout: {
            view: 'card',
            fields: ['Thumbnail', 'PlaylistTitle', 'TrackCount', 'Genre'],
        },
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            return createItemsPager({
                ids: getIdFromSrc(pin),
                IncludeItemTypes: 'Playlist',
            });
        },
    };
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return jellyfinApi.getFilters(filterType, itemType);
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const id = getIdFromSrc(item);
    const pager = new JellyfinPager<T>(`Users/${jellyfinSettings.userId}/Items/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    const items = await fetchFirstPage<T>(pager, {timeout: 2000});
    return bestOf(item, items[0]);
}

function getPlayableUrl(item: PlayableItem): string {
    return jellyfinApi.getPlayableUrl(item);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return jellyfinApi.getPlaybackType(item);
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

function scrobble(): void {
    embyScrobbler.scrobble(jellyfin, jellyfinSettings);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const id = getIdFromSrc(item);
    const path = `Users/${jellyfinSettings.userId}/FavoriteItems/${id}`;
    if (inLibrary) {
        await jellyfinApi.post(path);
    } else {
        await jellyfinApi.delete(path);
    }
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
        SearchTerm: q.trim(),
        ...filters,
    };
    if (itemType === ItemType.Artist) {
        return new JellyfinPager('Artists', {...params, UserId: jellyfinSettings.userId}, options);
    } else {
        switch (itemType) {
            case ItemType.Media:
                params.IncludeItemTypes = 'Audio';
                params.SortBy = 'AlbumArtist,Album,SortName';
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
    return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, params, options);
}

function getMusicLibraryId(): string {
    const libraryId = jellyfinSettings.libraryId;
    if (!libraryId) {
        throw new NoMusicLibraryError();
    }
    return libraryId;
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
