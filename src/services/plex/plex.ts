import type {Observable} from 'rxjs';
import {Except, SetOptional, Writable} from 'type-fest';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import Pin from 'types/Pin';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import plexSettings from './plexSettings';
import {
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
} from './plexAuth';
import plexApi, {getMusicLibraryId, getMusicLibraryPath, getPlexMediaType} from './plexApi';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import PlexPager from './PlexPager';
import {scrobble} from './plexScrobbler';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';
import Login from './components/PlexLogin';
import ServerSettings from './components/PlexServerSettings';

const tracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount', 'Rate'],
};

const albumsLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'Rate'],
};

const albumTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['AlbumTrack', 'Artist', 'Title', 'Duration', 'PlayCount', 'Rate'],
};

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: [
        'Index',
        'Artist',
        'Title',
        'Album',
        'Track',
        'Duration',
        'Genre',
        'PlayCount',
        'Rate',
    ],
};

const plexSearch: MediaMultiSource = {
    id: 'plex/search',
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {title: 'Tracks', layout: tracksLayout}),
        createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
        createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            title: 'Playlists',
            layout: playlistLayout,
            secondaryLayout: playlistItemsLayout,
        }),
    ],
};

const plexRecentlyAdded: MediaSource<MediaItem> = {
    id: 'plex/recently-added',
    title: 'Recently Added',
    icon: 'recently-added',
    itemType: ItemType.Media,
    defaultHidden: true,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'AddedAt'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Track,
                'album.addedAt>>': '-6mon',
                sort: 'album.addedAt:desc',
            },
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
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Track,
                'lastViewedAt>': '0',
                sort: 'lastViewedAt:desc',
            },
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
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Track,
                'viewCount>': '1',
                sort: 'viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexTopTracks: MediaSource<MediaItem> = {
    id: 'plex/top-tracks',
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: {
        view: 'details',
        fields: ['Rate', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Track,
                'track.userRating>': '1',
                sort: 'track.userRating:desc,viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexTopAlbums: MediaSource<MediaAlbum> = {
    id: 'plex/top-albums',
    title: 'Top Albums',
    icon: 'star',
    itemType: ItemType.Album,
    lockActionsStore: true,
    layout: albumsLayout,
    secondaryLayout: albumTracksLayout,

    search(): Pager<MediaAlbum> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Album,
                'album.userRating>': '1',
                sort: 'album.userRating:desc,viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexTopArtists: MediaSource<MediaArtist> = {
    id: 'plex/top-artists',
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Genre', 'Rate'],
    },
    tertiaryLayout: albumTracksLayout,

    search(): Pager<MediaArtist> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Artist,
                'artist.userRating>': '1',
                sort: 'artist.userRating:desc,viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexPlaylists: MediaSource<MediaPlaylist> = {
    id: 'plex/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        getMusicLibraryId(); // Make sure to throw even if not needed
        return new PlexPager({
            path: '/playlists/all',
            params: {
                type: plexMediaType.Playlist,
                playlistType: 'audio',
                sort: 'addedAt:desc',
            },
        });
    },
};

const plexEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: 'plex/editable-playlists',
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        getMusicLibraryId();
        return new PlexPager({
            path: '/playlists/all',
            params: {
                type: plexMediaType.Playlist,
                playlistType: 'audio',
                readOnly: '0',
                smart: '0',
            },
        });
    },
};

const plexAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: 'plex/albums-by-genre',
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,

    search(genre?: MediaFilter): Pager<MediaAlbum> {
        if (genre) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: genre.id,
                    type: plexMediaType.Album,
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexArtistsByGenre: MediaSource<MediaArtist> = {
    id: 'plex/artists-by-genre',
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    Component: FilterBrowser,

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: genre.id,
                    type: plexMediaType.Artist,
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: 'plex/albums-by-decade',
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    filterType: FilterType.ByDecade,
    Component: FilterBrowser,

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    decade: decade.id,
                    type: plexMediaType.Album,
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexRandomTracks: MediaSource<MediaItem> = {
    id: 'plex/random-tracks',
    title: 'Random Tracks',
    icon: 'shuffle',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager(
            {
                path: getMusicLibraryPath(),
                params: {type: plexMediaType.Track, sort: 'random'},
            },
            {maxSize: 100}
        );
    },
};

const plexRandomAlbums: MediaSource<MediaAlbum> = {
    id: 'plex/random-albums',
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,
    layout: albumsLayout,
    secondaryLayout: albumTracksLayout,

    search(): Pager<MediaAlbum> {
        return new PlexPager(
            {
                path: getMusicLibraryPath(),
                params: {type: plexMediaType.Album, sort: 'random'},
            },
            {maxSize: 100}
        );
    },
};

const plexMusicVideos: MediaSource<MediaItem> = {
    id: 'plex/videos',
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
        return new PlexPager({
            path: getMusicLibraryPath('extras/all'),
            params: {
                title: q,
                type: plexMediaType.Artist,
                extraType: plexMediaType.Episode,
            },
        });
    },
};

const plexFolders: MediaSource<MediaFolderItem> = {
    id: 'plex/folders',
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    Component: FolderBrowser,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: 'plex:folder:',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new SimpleMediaPager<MediaFolderItem>(async () =>
            plexSettings.libraries.map(({id, title}) => {
                const section: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `plex:folder:/library/sections/${id}/folder`,
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
                    {
                        path: `library/sections/${id}/folder`,
                        params: {includeCollections: '1'},
                    },
                    undefined,
                    section as MediaFolder
                );

                section.pager = new WrappedPager<MediaFolderItem>(backPager, folderPager);

                return section as MediaFolder;
            })
        );

        return root.pager;
    },
};

const plex: PersonalMediaService = {
    id: 'plex',
    name: 'Plex',
    icon: 'plex',
    url: 'https://www.plex.tv',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: true,
    Components: {Login, ServerSettings},
    get internetRequired() {
        return plexSettings.internetRequired;
    },
    root: plexSearch,
    sources: [
        plexTopTracks,
        plexTopAlbums,
        plexTopArtists,
        plexMostPlayed,
        plexRecentlyAdded,
        plexRecentlyPlayed,
        plexPlaylists,
        plexAlbumsByGenre,
        plexArtistsByGenre,
        plexAlbumsByDecade,
        plexRandomTracks,
        plexRandomAlbums,
        plexMusicVideos,
        plexFolders,
    ],
    editablePlaylists: plexEditablePlaylists,
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return plexSettings.audioLibraries;
    },
    get host(): string {
        return plexSettings.host;
    },
    get libraryId(): string {
        return plexSettings.libraryId;
    },
    set libraryId(libraryId: string) {
        plexSettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return plexSettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        plexSettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return plexSettings.observeLibraryId();
    },
    addToPlaylist,
    canRate,
    canStore: () => false,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMetadata,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    getThumbnailUrl,
    lookup,
    rate,
    scrobble,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default plex;

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function canRate<T extends MediaObject>(item: T, inline?: boolean): boolean {
    if (inline || !item.src.startsWith('plex:')) {
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

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    return plexApi.addToPlaylist(playlist, items);
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await plexApi.createPlaylist(name, description, items);
    return {
        src: `plex:playlist:${playlist.ratingKey}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,
        layout: {
            view: 'card',
            fields: ['Thumbnail', 'PlaylistTitle', 'TrackCount', 'Blurb'],
        },

        search(): Pager<MediaPlaylist> {
            return new PlexPager({
                path: `/playlists/${getRatingKey(pin)}`,
                params: {
                    type: plexMediaType.Playlist,
                    playlistType: 'audio',
                },
            });
        },
    };
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return plexApi.getFilters(filterType, itemType);
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const rating = actionsStore.getRating(item);
    if (rating !== undefined) {
        return {...item, rating};
    }
    const ratingKey = getRatingKey(item);
    const [plexItem] = await plexApi.getMetadata<plex.RatingObject>([ratingKey]);
    return {...item, rating: Math.round((plexItem.userRating || 0) / 2)};
}

function getPlayableUrl(item: PlayableItem): string {
    return plexApi.getPlayableUrl(item);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return plexApi.getPlaybackType(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    let server = plexSettings.server;
    if (server) {
        const servers = await plexApi.getServers();
        server = servers.find((s) => s.id === server!.id) || server;
        return {
            'Server type': server.product || '',
            'Server version': server.productVersion?.replace(/-.*$/, '') || '',
        };
    } else {
        return {};
    }
}

function getThumbnailUrl(url: string): string {
    return url.replace('{plex-token}', plexSettings.serverToken);
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
    return fetchFirstPage(
        new PlexPager<MediaItem>(
            {
                path: `/library/search`,
                params: {
                    query: `${artist} ${title}`,
                    searchTypes: 'music',
                    limit: 50,
                    type: plexItemType.Track,
                },
            },
            {pageSize: limit, maxSize: limit, lookup: true}
        ),
        {timeout}
    );
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    await plexApi.fetch({
        path: '/:/rate',
        method: 'PUT',
        params: {
            key: getRatingKey(item),
            identifier: 'com.plexapp.plugins.library',
            rating: rating * 2 || -1,
        },
    });
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
    getMusicLibraryId(); // Make sure to throw even if not needed
    const path = itemType === ItemType.Playlist ? '/playlists/all' : getMusicLibraryPath();
    const params: Record<string, string> = {...filters};
    if (q) {
        params.title = q.trim();
    }
    params.type = getPlexMediaType(itemType);
    if (itemType === ItemType.Playlist) {
        params.playlistType = 'audio';
    }
    return new PlexPager<T>({path, params}, options);
}

function getRatingKey({src}: {src: string}): string {
    const [, , ratingKey] = src.split(':');
    return ratingKey;
}
