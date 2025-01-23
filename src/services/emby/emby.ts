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
import {NoMusicLibraryError, NoMusicVideoLibraryError} from 'services/errors';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import {bestOf} from 'utils';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './embyAuth';
import EmbyPager from './EmbyPager';
import embySettings from './embySettings';
import embyApi from './embyApi';
import embyScrobbler from './embyScrobbler';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';

const serviceId: MediaServiceId = 'emby';

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Genre', 'Progress'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Duration', 'Genre', 'PlayCount'],
};

const embySearch: MediaMultiSource = {
    id: 'emby/search',
    title: 'Search',
    icon: 'search',
    searchable: true,
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

const embyLikedSongs: MediaSource<MediaItem> = {
    id: 'emby/liked-songs',
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

const embyLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'emby/liked-albums',
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

const embyLikedArtists: MediaSource<MediaArtist> = {
    id: 'emby/liked-artists',
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,
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

const embyEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: 'emby/editable-playlists',
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

const embyTracksByGenre: MediaSource<MediaItem> = {
    id: 'emby/tracks-by-genre',
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,
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

const embyAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: 'emby/albums-by-genre',
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,

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

const embyArtistsByGenre: MediaSource<MediaArtist> = {
    id: 'emby/artists-by-genre',
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,
    defaultHidden: true,

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new EmbyPager('Artists/AlbumArtists', {
                ParentId: getMusicLibraryId(),
                GenreIds: genre.id,
                UserId: embySettings.userId,
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyTracksByDecade: MediaSource<MediaItem> = {
    id: 'emby/tracks-by-decade',
    title: 'Songs by Decade',
    icon: 'calendar',
    itemType: ItemType.Media,
    filterType: FilterType.ByDecade,
    Component: FilterBrowser,
    defaultHidden: true,
    layout: {
        view: 'details',
        fields: ['Year', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
    },

    search(decade?: MediaFilter): Pager<MediaItem> {
        if (decade) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Years: decade.id,
                IncludeItemTypes: 'Audio',
                SortBy: 'ProductionYear,PremiereDate,AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName',
                SortOrder: 'Descending,Descending,Ascending,Ascending,Ascending,Ascending,Ascending'
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: 'emby/albums-by-decade',
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    filterType: FilterType.ByDecade,
    Component: FilterBrowser,

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Years: decade.id,
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'ProductionYear,AlbumArtist,PremiereDate,SortName',
                SortOrder: 'Descending,Ascending,Descending,Ascending'
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyRandomTracks: MediaSource<MediaItem> = {
    id: 'emby/random-tracks',
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

const embyRandomAlbums: MediaSource<MediaAlbum> = {
    id: 'emby/random-albums',
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

const embyMusicVideos: MediaSource<MediaItem> = {
    id: 'emby/videos',
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
        const videoLibraryId = embySettings.videoLibraryId;
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

const embyFolders: MediaSource<MediaFolderItem> = {
    id: 'emby/folders',
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    Component: FolderBrowser,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: '',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new SimpleMediaPager<MediaFolderItem>(async () =>
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

                library.pager = new WrappedPager<MediaFolderItem>(backPager, folderPager);

                return library as MediaFolder;
            })
        );

        return root.pager;
    },
};

const emby: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Emby',
    url: 'https://emby.media',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: true,
    root: embySearch,
    sources: [
        embyLikedSongs,
        embyLikedAlbums,
        embyLikedArtists,
        embyMostPlayed,
        embyRecentlyPlayed,
        embyPlaylists,
        embyTracksByGenre,
        embyAlbumsByGenre,
        embyArtistsByGenre,
        embyTracksByDecade,
        embyAlbumsByDecade,
        embyRandomTracks,
        embyRandomAlbums,
        embyMusicVideos,
        embyFolders,
    ],
    labels: {
        [Action.AddToLibrary]: t('Add to Emby Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Emby Favorites'),
    },
    editablePlaylists: embyEditablePlaylists,
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return embySettings.audioLibraries;
    },
    get host(): string {
        return embySettings.host;
    },
    get libraryId(): string {
        return embySettings.libraryId;
    },
    set libraryId(libraryId: string) {
        embySettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return embySettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        embySettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return embySettings.observeLibraryId();
    },
    addMetadata,
    addToPlaylist,
    canRate: () => false,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMediaObject,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    lookup,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default emby;

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
    return embyApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await embyApi.createPlaylist(name, description, items.map(getIdFromSrc));
    return {
        src: `emby:playlist:${playlist.Id}`,
        title: name,
        itemType: ItemType.Playlist,
        trackCount: items.length,
        pager: new SimplePager(),
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        layout: {
            view: 'card',
            fields: ['Thumbnail', 'PlaylistTitle', 'TrackCount', 'Genre', 'Progress'],
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
    return embyApi.getFilters(filterType, itemType);
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const metadata = await getMediaObject<T>(item.src);
    return bestOf(item, metadata);
}

async function getMediaObject<T extends MediaObject>(src: string): Promise<T> {
    const id = getIdFromSrc({src});
    const pager = new EmbyPager<T>(`Users/${embySettings.userId}/Items/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    return fetchFirstItem<T>(pager, {timeout: 2000});
}

function getPlayableUrl(item: PlayableItem): string {
    return embyApi.getPlayableUrl(item);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return embyApi.getPlaybackType(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    const system = await embyApi.getSystemInfo();
    const info: Record<string, string> = {};
    if (system.ProductName) {
        info['Server type'] = system.ProductName;
    }
    info['Server version'] = system.Version || '';
    return info;
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
    embyScrobbler.scrobble(emby, embySettings);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const id = getIdFromSrc(item);
    const path = `Users/${embySettings.userId}/FavoriteItems/${id}`;
    if (inLibrary) {
        await embyApi.post(path);
    } else {
        await embyApi.delete(path);
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
        SearchTerm: q.trim(),
        ...filters,
    };
    switch (itemType) {
        case ItemType.Media:
            params.IncludeItemTypes = 'Audio';
            break;

        case ItemType.Album:
            params.IncludeItemTypes = 'MusicAlbum';
            break;

        case ItemType.Artist:
            params.IncludeItemTypes = 'MusicArtist';
            params.SortBy = 'SortName';
            break;

        case ItemType.Playlist:
            params.IncludeItemTypes = 'Playlist';
            params.SortBy = 'SortName';
            break;
    }
    return createItemsPager(params, options);
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
        throw new NoMusicLibraryError();
    }
    return libraryId;
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
