import {Except, SetOptional, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import ViewType from 'types/ViewType';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import ratingStore from 'services/actions/ratingStore';
import DualPager from 'services/pagers/DualPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import {bestOf, uniqBy} from 'utils';
import plexSettings from './plexSettings';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './plexAuth';
import plexApi from './plexApi';
import PlexPager from './PlexPager';

console.log('module::plex');

const tracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount', 'Rate'],
};

const albumTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Duration', 'PlayCount', 'Rate'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount', 'Rate'],
};

const plexMusicVideos: MediaSource<MediaItem> = {
    id: 'plex/videos',
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
        return new PlexPager(`/library/sections/${getMusicLibraryId()}/extras/all`, {
            title: q,
            type: '8', // artist
            extraType: '4', // video
        });
    },
};

const plexRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'plex/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${getMusicLibraryId()}/all`, {
            type: '10', // track
            'lastViewedAt>': '0',
            sort: 'lastViewedAt:desc',
        });
    },
};

const plexMostPlayed: MediaSource<MediaItem> = {
    id: 'plex/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    layout: {
        view: 'details',
        fields: ['PlayCount', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Rate'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${getMusicLibraryId()}/all`, {
            type: '10', // track
            'viewCount>': '1',
            sort: 'viewCount:desc,lastViewedAt:desc',
        });
    },
};

const plexTopTracks: MediaSource<MediaItem> = {
    id: 'plex/top-tracks',
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    viewType: ViewType.Ratings,
    layout: {
        view: 'details',
        fields: ['Rate', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${getMusicLibraryId()}/all`, {
            type: '10', // track
            'track.userRating>': '1',
            sort: 'track.userRating:desc,viewCount:desc,lastViewedAt:desc',
        });
    },
};

const plexTopAlbums: MediaSource<MediaAlbum> = {
    id: 'plex/top-albums',
    title: 'Top Albums',
    icon: 'star',
    itemType: ItemType.Album,
    viewType: ViewType.Ratings,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'Rate'],
    },
    secondaryLayout: albumTracksLayout,

    search(): Pager<MediaAlbum> {
        return new PlexPager(`/library/sections/${getMusicLibraryId()}/all`, {
            type: '9', // album
            'album.userRating>': '1',
            sort: 'album.userRating:desc,viewCount:desc,lastViewedAt:desc',
        });
    },
};

const plexTopArtists: MediaSource<MediaArtist> = {
    id: 'plex/top-artists',
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    viewType: ViewType.Ratings,
    defaultHidden: true,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Genre', 'Rate'],
    },
    tertiaryLayout: albumTracksLayout,

    search(): Pager<MediaArtist> {
        return new PlexPager(`/library/sections/${getMusicLibraryId()}/all`, {
            type: '8', // artist
            'artist.userRating>': '1',
            sort: 'artist.userRating:desc,viewCount:desc,lastViewedAt:desc',
        });
    },
};

const plexPlaylists: MediaSource<MediaPlaylist> = {
    id: 'plex/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        getMusicLibraryId(); // Make sure to throw even if not needed
        return new PlexPager('/playlists/all', {
            type: '15', // playlist
            playlistType: 'audio',
        });
    },
};

const plexFolders: MediaSource<MediaFolderItem> = {
    id: 'plex/folders',
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    defaultHidden: true,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: 'plex:folder:',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new SimpleMediaPager<MediaFolderItem>(() =>
            plexSettings.sections.map(({key, title}) => {
                const section: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `plex:folder:/library/sections/${key}/folder`,
                    title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager([parentFolder]);
                const folderPager = new PlexPager<MediaFolderItem>(
                    `library/sections/${key}/folder`,
                    {includeCollections: '1'},
                    undefined,
                    section as MediaFolder
                );

                section.pager = new DualPager<MediaFolderItem>(backPager, folderPager);

                return section as MediaFolder;
            })
        );

        return root.pager;
    },
};

const plex: MediaService = {
    id: 'plex',
    name: 'Plex',
    icon: 'plex',
    url: 'https://www.plex.tv',
    get libraryId(): string {
        return plexSettings.libraryId;
    },
    roots: [
        createRoot(ItemType.Media, {title: 'Songs', layout: tracksLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists', secondaryLayout: playlistItemsLayout}),
    ],
    sources: [
        plexTopTracks,
        plexTopAlbums,
        plexTopArtists,
        plexMostPlayed,
        plexRecentlyPlayed,
        plexPlaylists,
        plexMusicVideos,
        plexFolders,
    ],
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

export default plex;

ratingStore.addObserver(plex);

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.plex!.ratingKey === b.plex!.ratingKey;
}

function canRate<T extends MediaObject>(item: T, inline?: boolean): boolean {
    if (inline) {
        return false;
    }
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

        case ItemType.Artist:
            return true;

        case ItemType.Media:
            return item.mediaType === MediaType.Audio;

        default:
            return false;
    }
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            return new PlexPager(`/playlists/${pin.plex!.ratingKey}`, {
                type: '15', // playlist
                playlistType: 'audio',
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
    const path =
        item.itemType === ItemType.Playlist
            ? `/playlists/${item.plex!.ratingKey}`
            : `/library/metadata/${item.plex!.ratingKey}`;
    const pager = new PlexPager<T>(path, undefined, {
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
    const lookup = async (filter: Record<string, string>): Promise<readonly MediaItem[]> =>
        fetchFirstPage(createSearchPager(ItemType.Media, title, filter, options), {timeout});
    const results = await Promise.all([
        lookup({'artist.title': artist}),
        lookup({originalTitle: artist}),
    ]);
    return uniqBy(results.flat(), 'src');
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    await plexApi.fetch({
        path: '/:/rate',
        method: 'PUT',
        params: {
            key: item.plex!.ratingKey,
            identifier: 'com.plexapp.plugins.library',
            rating: rating * 2 || -1,
        },
    });
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `plex/search/${props.title.toLowerCase()}`,
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
    const libraryId = getMusicLibraryId(); // Make sure to throw even if not needed
    const path =
        itemType === ItemType.Playlist ? '/playlists/all' : `/library/sections/${libraryId}/all`;
    const params: Record<string, string> = {...filters, title: q, sort: 'titleSort:asc'};
    switch (itemType) {
        case ItemType.Media:
            params.type = '10';
            params.sort = 'artist.titleSort:asc,album.titleSort:asc,track.index:asc';
            break;

        case ItemType.Album:
            params.type = '9';
            params.sort = 'artist.titleSort:asc,titleSort:asc';
            break;

        case ItemType.Artist:
            params.type = '8';
            break;

        case ItemType.Playlist:
            params.type = '15';
            params.playlistType = 'audio';
            break;
    }
    return new PlexPager<T>(path, params, options);
}

function getMusicLibraryId(): string {
    const libraryId = plexSettings.libraryId;
    if (!libraryId) {
        throw Error('No music library');
    }
    return libraryId;
}
