import type {Observable} from 'rxjs';
import {Except, SetOptional, Writable} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaFolder from 'types/MediaFolder';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import Pin from 'types/Pin';
import ServiceType from 'types/ServiceType';
import ViewType from 'types/ViewType';
import actionsStore from 'services/actions/actionsStore';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {getTextFromHtml} from 'utils';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './subsonicAuth';
import subsonicApi from './subsonicApi';
import SubsonicPager from './SubsonicPager';
import subsonicSettings from './subsonicSettings';

const serviceId: MediaServiceId = 'subsonic';

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
};

const subsonicLikedSongs: MediaSource<MediaItem> = {
    id: 'subsonic/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Artist', 'Title', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new SubsonicPager(ItemType.Media, async (): Promise<Page<Subsonic.Song>> => {
            const items = await subsonicApi.getLikedSongs();
            return {items, atEnd: true};
        });
    },
};

const subsonicLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'subsonic/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        return new SubsonicPager(
            ItemType.Album,
            async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                const items = await subsonicApi.getLikedAlbums(offset, count);
                return {items};
            }
        );
    },
};

const subsonicRecentlyPlayed: MediaSource<MediaAlbum> = {
    id: 'subsonic/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new SubsonicPager(
            ItemType.Album,
            async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                const items = await subsonicApi.getRecentlyPlayed(offset, count);
                return {items};
            }
        );
    },
};

const subsonicMostPlayed: MediaSource<MediaAlbum> = {
    id: 'subsonic/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Album,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'PlayCount'],
    },
    secondaryLayout: {
        view: 'details',
        fields: ['Index', 'Title', 'Artist', 'Duration', 'PlayCount'],
    },

    search(): Pager<MediaAlbum> {
        return new SubsonicPager(
            ItemType.Album,
            async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                const items = await subsonicApi.getMostPlayed(offset, count);
                return {items};
            }
        );
    },
};

const subsonicPlaylists: MediaSource<MediaPlaylist> = {
    id: 'subsonic/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return new SubsonicPager(ItemType.Playlist, async (): Promise<Page<Subsonic.Playlist>> => {
            const items = await subsonicApi.getPlaylists();
            return {items, atEnd: true};
        });
    },
};

const subsonicTracksByGenre: MediaSource<MediaItem> = {
    id: 'subsonic/tracks-by-genre',
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    viewType: ViewType.ByGenre,
    defaultHidden: true,
    layout: {
        view: 'details',
        fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
    },

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new SubsonicPager(
                ItemType.Media,
                async (offset: number, count: number): Promise<Page<Subsonic.MediaItem>> => {
                    const items = await subsonicApi.getSongsByGenre(genre.id, offset, count);
                    return {items, total: genre.count};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const subsonicAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: 'subsonic/albums-by-genre',
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    viewType: ViewType.ByGenre,

    search(genre?: MediaFilter): Pager<MediaAlbum> {
        if (genre) {
            return new SubsonicPager(
                ItemType.Album,
                async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                    const items = await subsonicApi.getAlbumsByGenre(genre.id, offset, count);
                    return {items, total: genre.count};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const subsonicAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: 'subsonic/albums-by-decade',
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    viewType: ViewType.ByDecade,

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return new SubsonicPager(
                ItemType.Album,
                async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                    const items = await subsonicApi.getAlbumsByDecade(decade.id, offset, count);
                    return {items};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const subsonicRandomTracks: MediaSource<MediaItem> = {
    id: 'subsonic/random-tracks',
    title: 'Random Songs',
    icon: 'shuffle',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new SubsonicPager(ItemType.Media, async () => {
            const items = await subsonicApi.getRandomSongs(100);
            return {items, atEnd: true};
        });
    },
};

const subsonicRandomAlbums: MediaSource<MediaAlbum> = {
    id: 'subsonic/random-albums',
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new SubsonicPager(ItemType.Album, async () => {
            const items = await subsonicApi.getRandomAlbums(100);
            return {items, atEnd: true};
        });
    },
};

const subsonicMusicVideos: MediaSource<MediaItem> = {
    id: 'subsonic/videos',
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    defaultHidden: true,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new SubsonicPager(ItemType.Media, async (): Promise<Page<Subsonic.Video>> => {
            const items = await subsonicApi.getVideos();
            return {items, atEnd: true};
        });
    },
};

const subsonicFolders: MediaSource<MediaFolderItem> = {
    id: 'subsonic/folders',
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    viewType: ViewType.Folders,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: '',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        const sortByName = (a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name);

        root.pager = new SimpleMediaPager<MediaFolderItem>(() =>
            subsonicSettings.libraries.map(({id, title}) => {
                const rootFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `subsonic:folder:${id}`,
                    title: title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager<MediaFolderItem>([parentFolder]);
                const folderPager = new SubsonicPager<MediaFolderItem>(
                    ItemType.Folder,
                    async (): Promise<Page<Subsonic.Directory>> => {
                        const indexes = await subsonicApi.getIndexes(id);
                        return {
                            items: indexes
                                .map((index) =>
                                    index.artist.map(
                                        ({id, name}) =>
                                            ({id, name, title: name} as Subsonic.Directory)
                                    )
                                )
                                .flat()
                                .sort(sortByName),
                            atEnd: true,
                        };
                    },
                    undefined,
                    rootFolder as MediaFolder
                );

                rootFolder.pager = new WrappedPager<MediaFolderItem>(backPager, folderPager);

                return rootFolder as MediaFolder;
            })
        );

        return root.pager;
    },
};

const subsonic: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Subsonic',
    url: 'http://www.subsonic.org/',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: true,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs'}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
    ],
    sources: [
        subsonicLikedSongs,
        subsonicLikedAlbums,
        subsonicRecentlyPlayed,
        subsonicMostPlayed,
        subsonicPlaylists,
        subsonicTracksByGenre,
        subsonicAlbumsByGenre,
        subsonicAlbumsByDecade,
        subsonicRandomTracks,
        subsonicRandomAlbums,
        subsonicMusicVideos,
        subsonicFolders,
    ],
    labels: {
        [Action.AddToLibrary]: 'Like on Subsonic',
        [Action.RemoveFromLibrary]: 'Unlike on Subsonic',
    },
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return subsonicSettings.audioLibraries;
    },
    get libraryId(): string {
        return subsonicSettings.libraryId;
    },
    set libraryId(libraryId: string) {
        subsonicSettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return subsonicSettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        subsonicSettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return subsonicSettings.observeLibraryId();
    },
    canRate: () => false,
    canStore,
    compareForRating,
    createSourceFromPin,
    getFilters,
    getMetadata,
    getPlayableUrl,
    getThumbnailUrl,
    lookup,
    store,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default subsonic;

function canStore<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Media:
            return true;

        case ItemType.Album:
            return !item.synthetic;

        default:
            return false;
    }
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    // This is not exactly right for albums (folderId vs albumId).
    // The only way to fix it is to make this function async.
    // It works for the majority of cases though.
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
            return new SubsonicPager(
                ItemType.Playlist,
                async (): Promise<Page<Subsonic.Playlist>> => {
                    const playlist = await subsonicApi.getPlaylist(id);
                    return {items: [playlist], atEnd: true};
                }
            );
        },
    };
}

async function getFilters(
    viewType: ViewType.ByDecade | ViewType.ByGenre,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return subsonicApi.getFilters(viewType, itemType);
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    const itemType = item.itemType;
    const [, , id] = item.src.split(':');
    if (itemType === ItemType.Album && item.description === undefined) {
        const info = await subsonicApi.getAlbumInfo(id, item.subsonic?.isDir);
        item = {
            ...item,
            description: getTextFromHtml(info.notes),
            release_mbid: info.musicBrainzId,
        };
    } else if (itemType === ItemType.Artist && item.description === undefined) {
        const info = await subsonicApi.getArtistInfo(id);
        item = {
            ...item,
            description: getTextFromHtml(info.biography),
            artist_mbid: info.musicBrainzId,
        };
    }
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    if (itemType === ItemType.Album) {
        const id = await getAlbumDirectoryId(item);
        const directory = await subsonicApi.getMusicDirectory(id);
        return {...item, inLibrary: directory.starred};
    } else {
        const song = await subsonicApi.getSong(id);
        return {...item, inLibrary: song.starred};
    }
}

function getPlayableUrl({src}: PlayableItem): string {
    return subsonicApi.getPlayableUrl(src);
}

function getThumbnailUrl(url: string): string {
    return url.replace('{subsonic-credentials}', subsonicSettings.credentials);
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
    const pager = new SubsonicPager<MediaItem>(
        ItemType.Media,
        async (offset: number, count: number): Promise<Page<Subsonic.Song>> => {
            const items = await subsonicApi.searchSongs(`${artist} ${title}`, offset, count);
            return {items};
        },
        options
    );
    return fetchFirstPage(pager, {timeout});
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const method = inLibrary ? 'star' : 'unstar';
    switch (item.itemType) {
        case ItemType.Media: {
            const [, , id] = item.src.split(':');
            await subsonicApi.get(method, {id});
            break;
        }

        case ItemType.Album: {
            // To stay in synch with the subsonic UI, we'll add likes to the directory rather than the album.
            const id = await getAlbumDirectoryId(item);
            await subsonicApi.get(method, {id});
            break;
        }
    }
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `subsonic/search/${props.title.toLowerCase()}`,
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            q = q.trim();
            if (q) {
                return new SubsonicPager(itemType, async (offset: number, count: number) => {
                    switch (itemType) {
                        case ItemType.Media: {
                            const items = await subsonicApi.searchSongs(q, offset, count);
                            return {items};
                        }

                        case ItemType.Album: {
                            const items = await subsonicApi.searchAlbums(q, offset, count);
                            return {items};
                        }

                        case ItemType.Artist: {
                            const items = await subsonicApi.searchArtists(q, offset, count);
                            return {items};
                        }

                        default:
                            throw TypeError('Search not supported for this type of media');
                    }
                });
            } else {
                return new SimplePager();
            }
        },
    };
}

async function getAlbumDirectoryId(album: MediaAlbum): Promise<string> {
    const [, , id] = album.src.split(':');
    if (album.subsonic?.isDir) {
        return id;
    }
    const [{parent}] = await subsonicApi.getAlbumTracks(id);
    return parent || '';
}
