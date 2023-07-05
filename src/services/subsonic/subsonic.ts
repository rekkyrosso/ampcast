import {Except, SetOptional, Writable} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaFolder from 'types/MediaFolder';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import ViewType from 'types/ViewType';
import DualPager from 'services/pagers/DualPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import ratingStore from 'services/actions/ratingStore';
import {getTextFromHtml} from 'utils';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './subsonicAuth';
import subsonicApi from './subsonicApi';
import SubsonicPager from './SubsonicPager';
import subsonicSettings from './subsonicSettings';

console.log('module::subsonic');

const serviceId: MediaServiceId = 'subsonic';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
};

const subsonicLikedSongs: MediaSource<MediaItem> = {
    id: 'subsonic/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    viewType: ViewType.Ratings,
    layout: defaultLayout,

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
    viewType: ViewType.Ratings,

    search(): Pager<MediaAlbum> {
        return new SubsonicPager(
            ItemType.Album,
            async (offset: number, pageSize: number): Promise<Page<Subsonic.Album>> => {
                const items = await subsonicApi.getLikedAlbums(offset, pageSize);
                return {items, atEnd: true};
            }
        );
    },
};

const subsonicRecentlyPlayed: MediaSource<MediaAlbum> = {
    id: 'subsonic/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Album,
    viewType: ViewType.RecentlyPlayed,

    search(): Pager<MediaAlbum> {
        return new SubsonicPager(
            ItemType.Album,
            async (offset: number, pageSize: number): Promise<Page<Subsonic.Album>> => {
                const items = await subsonicApi.getRecentlyPlayed(offset, pageSize);
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
    viewType: ViewType.MostPlayed,
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
            async (offset: number, pageSize: number): Promise<Page<Subsonic.Album>> => {
                const items = await subsonicApi.getMostPlayed(offset, pageSize);
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

const subsonicMusicVideos: MediaSource<MediaItem> = {
    id: 'subsonic/videos',
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
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
    defaultHidden: true,

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
            subsonicSettings.folders.sort(sortByName).map(({id, name}) => {
                const rootFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `subsonic:folder:${id}`,
                    title: name,
                    fileName: name,
                    path: `/${name}`,
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

                rootFolder.pager = new DualPager<MediaFolderItem>(backPager, folderPager);

                return rootFolder as MediaFolder;
            })
        );

        return root.pager;
    },
};

const subsonicSongsByGenre: MediaSource<MediaItem> = {
    id: 'subsonic/songs-by-genre',
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    defaultHidden: true,
    layout: {
        view: 'details',
        fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
    },

    search({genre, total}: {genre?: string; total?: number}): Pager<MediaItem> {
        if (genre && total) {
            return new SubsonicPager(
                ItemType.Media,
                async (offset: number, count: number): Promise<Page<Subsonic.MediaItem>> => {
                    const items = await subsonicApi.getSongsByGenre(genre, offset, count);
                    return {items, total};
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
    defaultHidden: true,

    search({genre, total}: {genre?: string; total?: number}): Pager<MediaAlbum> {
        if (genre && total) {
            return new SubsonicPager(
                ItemType.Album,
                async (offset: number, count: number): Promise<Page<Subsonic.Album>> => {
                    const items = await subsonicApi.getAlbumsByGenre(genre, offset, count);
                    return {items, total};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const subsonic: MediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Subsonic',
    url: 'http://www.subsonic.org/',
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
        subsonicSongsByGenre,
        subsonicAlbumsByGenre,
        subsonicPlaylists,
        subsonicMusicVideos,
        subsonicFolders,
    ],
    labels: {
        [Action.Like]: 'Like on Subsonic',
        [Action.Unlike]: 'Unlike on Subsonic',
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

export default subsonic;

ratingStore.addObserver(subsonic);

function canRate<T extends MediaObject>(item: T): boolean {
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
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const rating = ratingStore.get(item);
    if (rating !== undefined) {
        return {...item, rating};
    }
    if (itemType === ItemType.Album) {
        const id = await getAlbumDirectoryId(item);
        const directory = await subsonicApi.getMusicDirectory(id);
        return {...item, rating: directory.starred ? 1 : 0};
    } else {
        const song = await subsonicApi.getSong(id);
        return {...item, rating: song.starred ? 1 : 0};
    }
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

async function rate(item: MediaObject, rating: number): Promise<void> {
    const method = rating ? 'star' : 'unstar';
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
            q = q.replace(/(\w{3,})(\s|$)/g, '$1*$2');
            switch (itemType) {
                case ItemType.Media:
                    return new SubsonicPager(itemType, async (offset: number, count: number) => {
                        if (q) {
                            const items = await subsonicApi.searchSongs(q, offset, count);
                            return {items};
                        } else {
                            const items = await subsonicApi.getRandomSongs(100);
                            return {items, atEnd: true};
                        }
                    });

                case ItemType.Album:
                    return new SubsonicPager(itemType, async (offset: number, count: number) => {
                        if (q) {
                            const items = await subsonicApi.searchAlbums(q, offset, count);
                            return {items};
                        } else {
                            const items = await subsonicApi.getRandomAlbums(100);
                            return {items, atEnd: true};
                        }
                    });

                case ItemType.Artist:
                    return new SubsonicPager(itemType, async (offset: number, count: number) => {
                        if (q) {
                            const items = await subsonicApi.searchArtists(q, offset, count);
                            return {items};
                        } else {
                            const items = await subsonicApi.getRandomArtists(100);
                            return {items, atEnd: true};
                        }
                    });

                default:
                    throw TypeError('Search not supported for this type of media');
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
