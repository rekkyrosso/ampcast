import {Except} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSearchParams from 'types/MediaSearchParams';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import Pin, {Pinnable} from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import {NoFavoritesPlaylistError} from 'services/errors';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import {isStartupService} from 'services/buildConfig';
import fetchAllTracks from 'services/pagers/fetchAllTracks';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {t} from 'services/i18n';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout, reconnect} from './appleAuth';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';
import appleSettings from './appleSettings';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import StreamingSettings from './components/AppleStreamingSettings';
import Credentials from './components/AppleCredentials';
import Login from './components/AppleLogin';
import './bootstrap';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const chartsLayoutLarge: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Index', 'Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const chartsLayoutSmall: MediaSourceLayout<MediaItem> = {
    view: 'card small',
    fields: ['Index', 'Thumbnail', 'Title', 'Artist', 'Duration'],
};

const appleLibrarySort: Pick<MediaSource<any>, 'sortOptions' | 'defaultSort'> = {
    sortOptions: {
        name: 'Sort by Title',
        dateAdded: 'Sort by Date Added',
    },
    defaultSort: {
        sortBy: 'dateAdded',
        sortOrder: -1,
    },
};

const appleSearch: MediaMultiSource = {
    id: 'apple/search',
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
        createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
        createSearch<MediaPlaylist>(ItemType.Playlist, {title: 'Playlists'}),
        createSearch<MediaItem>(
            ItemType.Media,
            {title: 'Videos', layout: defaultLayout, mediaType: MediaType.Video},
            {types: 'music-videos'},
            {maxSize: 250}
        ),
    ],
};

const appleRecommendations: MediaSource<MediaPlaylist> = {
    id: 'apple/recommendations',
    title: 'Recommended',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/me/recommendations',
            undefined,
            undefined,
            undefined,
            ({data = [], next: nextPageUrl, meta}: any): MusicKitPage => {
                const items = data
                    .map((data: any) =>
                        data.relationships.contents.data.filter(
                            (data: any) => data.type === 'playlists'
                        )
                    )
                    .flat();
                const total = meta?.total;
                return {items, total, nextPageUrl};
            }
        );
    },
};

const appleRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'apple/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new MusicKitPager('/v1/me/recent/played/tracks', undefined, {
            pageSize: 30,
            maxSize: 200,
        });
    },
};

const appleLibrarySongs: MediaSource<MediaItem> = {
    id: 'apple/library-songs',
    title: 'My Songs',
    icon: 'tick',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: defaultLayout,
    defaultHidden: true,
    ...appleLibrarySort,

    search(
        {sortBy, sortOrder}: MediaSearchParams = appleLibrarySort.defaultSort
    ): Pager<MediaItem> {
        return new MusicKitPager('/v1/me/library/songs', {
            'include[library-songs]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleLibraryAlbums: MediaSource<MediaAlbum> = {
    id: 'apple/library-albums',
    title: 'My Albums',
    icon: 'tick',
    itemType: ItemType.Album,
    lockActionsStore: true,
    ...appleLibrarySort,

    search(
        {sortBy, sortOrder}: MediaSearchParams = appleLibrarySort.defaultSort
    ): Pager<MediaAlbum> {
        return new MusicKitPager('/v1/me/library/albums', {
            'fields[library-albums]': 'name,artistName,playParams,artwork',
            'include[library-albums]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleLibraryArtists: MediaSource<MediaArtist> = {
    id: 'apple/library-artists',
    title: 'My Artists',
    icon: 'tick',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new MusicKitPager('/v1/me/library/artists', {
            'fields[library-artists]': 'name,playParams,artwork',
            'include[library-artists]': 'catalog',
            'omit[resource:artists]': 'relationships',
        });
    },
};

const appleLibraryPlaylists: MediaSource<MediaPlaylist> = {
    id: 'apple/playlists',
    title: 'My Playlists',
    icon: 'tick',
    itemType: ItemType.Playlist,
    lockActionsStore: true,
    ...appleLibrarySort,

    search(
        {sortBy, sortOrder}: MediaSearchParams = appleLibrarySort.defaultSort
    ): Pager<MediaPlaylist> {
        return new MusicKitPager('/v1/me/library/playlists', {
            'fields[library-playlists]': 'name,playParams,artwork',
            'include[library-playlists]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: 'apple/editable-playlists',
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager('/v1/me/library/playlists', {
            'fields[library-playlists]': 'name,playParams,artwork',
            'include[library-playlists]': 'catalog',
            'filter[featured]': 'suggested',
        });
    },
};

const appleLibraryVideos: MediaSource<MediaItem> = {
    id: 'apple/library-videos',
    title: 'My Videos',
    icon: 'tick',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    lockActionsStore: true,
    layout: defaultLayout,
    defaultHidden: true,
    ...appleLibrarySort,

    search(
        {sortBy, sortOrder}: MediaSearchParams = appleLibrarySort.defaultSort
    ): Pager<MediaItem> {
        return new MusicKitPager('/v1/me/library/music-videos', {
            'include[library-music-videos]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleFavoriteSongs: MediaSource<MediaItem> = {
    id: 'apple/favorite-songs',
    get title(): string {
        return t('Favorite Songs');
    },
    icon: 'star',
    itemType: ItemType.Media,
    layout: defaultLayout,
    defaultHidden: true,

    search(): Pager<MediaItem> {
        const playlistId = appleSettings.favoriteSongsId;
        if (!playlistId) {
            throw new NoFavoritesPlaylistError();
        }
        return new MusicKitPager(
            `/v1/me/library/playlists/${playlistId}/tracks`,
            {'include[library-songs]': 'catalog'},
            undefined,
            {
                src: `apple:library-playlists:${playlistId}`,
                itemType: ItemType.Playlist,
            } as MediaPlaylist
        );
    },
};

const appleSongCharts: MediaSource<MediaItem> = {
    id: 'apple/top-songs',
    title: 'Top Songs',
    icon: 'chart',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    layout: chartsLayoutLarge,
    Component: FilterBrowser,

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new MusicKitPager(
                '/v1/catalog/{{storefrontId}}/charts',
                {types: 'songs', genre: genre.id},
                {maxSize: 200, pageSize: 50},
                undefined,
                (response: any): MusicKitPage => {
                    const result = response.results?.songs?.[0] || {data: []};
                    const nextPageUrl = result.next;
                    return {items: result.data, nextPageUrl};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const appleAlbumCharts: MediaSource<MediaAlbum> = {
    id: 'apple/top-albums',
    title: 'Top Albums',
    icon: 'chart',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,
    layout: {
        view: 'card compact',
        fields: ['Index', 'Thumbnail', 'Title', 'Artist', 'Year'],
    },

    search(genre?: MediaFilter): Pager<MediaAlbum> {
        if (genre) {
            return new MusicKitPager(
                '/v1/catalog/{{storefrontId}}/charts',
                {types: 'albums', genre: genre.id},
                {maxSize: 200, pageSize: 50},
                undefined,
                (response: any): MusicKitPage => {
                    const result = response.results?.albums?.[0] || {data: []};
                    const nextPageUrl = result.next;
                    return {items: result.data, nextPageUrl};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const applePlaylistCharts: MediaSource<MediaPlaylist> = {
    id: 'apple/top-playlists',
    title: 'Top Playlists',
    icon: 'chart',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    layout: {
        view: 'card compact',
        fields: ['Index', 'Thumbnail', 'Title', 'TrackCount', 'Owner'],
    },

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/charts',
            {types: 'playlists'},
            {maxSize: 200, pageSize: 50},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results?.playlists?.[0] || {data: []};
                const nextPageUrl = result.next;
                return {items: result.data, nextPageUrl};
            }
        );
    },
};

const appleMusicVideoCharts: MediaSource<MediaItem> = {
    id: 'apple/top-videos',
    title: 'Top Videos',
    icon: 'chart',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,
    layout: chartsLayoutLarge,
    defaultHidden: true,

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new MusicKitPager(
                '/v1/catalog/{{storefrontId}}/charts',
                {types: 'music-videos', genre: genre.id},
                {maxSize: 200, pageSize: 50},
                undefined,
                (response: any): MusicKitPage => {
                    const result = response.results?.['music-videos']?.[0] || {data: []};
                    const nextPageUrl = result.next;
                    return {items: result.data, nextPageUrl};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const appleGlobalCharts: MediaSource<MediaPlaylist> = {
    id: 'apple/global-charts',
    title: 'Daily Top 100',
    icon: 'chart',
    itemType: ItemType.Playlist,
    secondaryLayout: chartsLayoutSmall,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/charts',
            {chartId: 'daily-global-top', with: 'dailyGlobalTopCharts'},
            {pageSize: 50},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results?.dailyGlobalTopCharts?.[0] || {data: []};
                const nextPageUrl = result.next;
                return {items: result.data, nextPageUrl};
            }
        );
    },
};

const appleCityCharts: MediaSource<MediaPlaylist> = {
    id: 'apple/city-charts',
    title: 'City Charts',
    icon: 'chart',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    secondaryLayout: chartsLayoutSmall,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/charts',
            {chartId: 'city-top', with: 'cityCharts'},
            {pageSize: 50},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results?.cityCharts?.[0] || {data: []};
                const nextPageUrl = result.next;
                return {items: result.data, nextPageUrl};
            }
        );
    },
};

const apple: PublicMediaService = {
    id: 'apple',
    name: 'Apple Music',
    icon: 'apple',
    url: 'https://music.apple.com',
    credentialsUrl: 'https://developer.apple.com',
    serviceType: ServiceType.PublicMedia,
    defaultHidden: !isStartupService('apple'),
    internetRequired: true,
    Components: {Credentials, Login, StreamingSettings},
    get credentialsLocked(): boolean {
        return appleSettings.credentialsLocked;
    },
    credentialsRequired: true,
    root: appleSearch,
    sources: [
        appleLibrarySongs,
        appleLibraryAlbums,
        appleLibraryArtists,
        appleLibraryPlaylists,
        appleLibraryVideos,
        appleFavoriteSongs,
        appleRecentlyPlayed,
        appleSongCharts,
        appleAlbumCharts,
        applePlaylistCharts,
        appleMusicVideoCharts,
        appleGlobalCharts,
        appleCityCharts,
        appleRecommendations,
    ],
    icons: {
        [Action.AddToLibrary]: 'plus',
        [Action.RemoveFromLibrary]: 'tick-fill',
    },
    labels: {
        [Action.AddToLibrary]: 'Add to Apple Music Library',
        [Action.RemoveFromLibrary]: 'Saved to Apple Music Library',
    },
    editablePlaylists: appleEditablePlaylists,
    addMetadata,
    addToPlaylist,
    canPin,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getDroppedItems,
    getFilters,
    getMediaObject,
    getPlaybackType,
    lookup,
    lookupByISRC,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default apple;

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Media:
        case ItemType.Playlist:
            return true;

        case ItemType.Album:
            return !item.synthetic;

        default:
            return false;
    }
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!item.synthetic && item.inLibrary === undefined) {
        let inLibrary = actionsStore.getInLibrary(item);
        if (inLibrary === undefined) {
            const [, type] = item.src.split(':');
            if (type.startsWith('library-')) {
                inLibrary = true;
            } else {
                const id = item.apple?.catalogId;
                if (id) {
                    [inLibrary] = await getInLibrary(type, [id]);
                }
            }
        }
        if (inLibrary !== undefined) {
            return {...item, inLibrary};
        }
    }
    return item;
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    const musicKit = MusicKit.getInstance();
    const [, , id] = playlist.src.split(':');
    const tracks = items.map((item) => {
        const [, type, id] = item.src.split(':');
        return {id, type};
    });
    return musicKit.api.music(`/v1/me/library/playlists/${id}/tracks`, undefined, {
        fetchOptions: {
            method: 'POST',
            body: JSON.stringify({data: tracks}),
        },
    });
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', isPublic, items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const musicKit = MusicKit.getInstance();
    const attributes = {name, description, isPublic};
    const tracks = items.map((item) => {
        const [, type, id] = item.src.split(':');
        return {id, type};
    });
    const relationships = {tracks: {data: tracks}};
    const {
        data: {
            data: [playlist],
        },
    } = await musicKit.api.music('/v1/me/library/playlists', undefined, {
        fetchOptions: {
            method: 'POST',
            body: JSON.stringify({attributes, relationships}),
        },
    });
    return {
        src: `apple:${playlist.type}:${playlist.id}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items.length,
    };
}

function createSourceFromPin<T extends Pinnable>(pin: Pin): MediaSource<T> {
    if (pin.itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    return {
        title: pin.title,
        itemType: pin.itemType,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<T> {
            const [, type, id] = pin.src.split(':');
            const isLibraryItem = type.startsWith('library-');
            const path = isLibraryItem ? '/v1/me/library' : '/v1/catalog/{{storefrontId}}';
            return new MusicKitPager(
                `${path}/playlists/${id}`,
                isLibraryItem
                    ? {
                          'include[library-playlists]': 'catalog',
                          'fields[library-playlists]': 'name,playParams,artwork',
                      }
                    : {
                          'omit[resource:playlists]': 'relationships',
                      },
                {pageSize: 0}
            );
        },
    };
}

async function getDroppedItems(
    type: DataTransferItem['type'],
    data: string
): Promise<readonly MediaItem[]> {
    switch (type) {
        case 'text/uri-list': {
            const [src] = data.split(/\s+/).map((uri) => getSrcFromUrl(uri));
            const [, type, id] = src.split(':');
            if (type === 'albums') {
                return getTracksByAlbumId(id);
            } else if (type === 'songs') {
                return getTracksById([id]);
            } else {
                throw Error('Unsupported drop type.');
            }
        }

        case 'text/plain': {
            const {items} = JSON.parse(data);
            const [{kind}] = items;
            if (kind === 'album') {
                const [item] = items;
                const {
                    identifiers: {storeAdamID},
                } = item;
                return getTracksByAlbumId(storeAdamID);
            } else if (kind === 'song') {
                const trackIds = items.map(({identifiers: {storeAdamID}}: any) => storeAdamID);
                return getTracksById(trackIds);
            } else {
                throw Error('Unsupported drop type.');
            }
        }

        default:
            throw Error('Unsupported drop type.');
    }
}

function getSrcFromUrl(src: string): string {
    if (src.startsWith('apple:')) {
        return src;
    }
    const url = new URL(src);
    const [id] = url.pathname.split('/').reverse();
    if (url.pathname.includes('/album/')) {
        const trackId = url.searchParams.get('i');
        if (trackId) {
            return `apple:songs:${trackId}`;
        } else {
            return `apple:albums:${id}`;
        }
    } else if (url.pathname.includes('/artist/')) {
        return `apple:artists:${id}`;
    } else if (url.pathname.includes('/playlist/')) {
        return `apple:playlists:${id}`;
    } else if (url.pathname.includes('/music-video/')) {
        return `apple:music-videos:${id}`;
    }
    return '';
}

async function getTracksById(trackIds: readonly string[]): Promise<readonly MediaItem[]> {
    const pageSize = 50;
    const ids = trackIds.slice(0, pageSize);
    const pager = new MusicKitPager<MediaItem>(
        '/v1/catalog/{{storefrontId}}',
        {['ids[songs]']: ids},
        {pageSize, maxSize: pageSize}
    );
    return fetchFirstPage(pager);
}

async function getTracksByAlbumId(id: string): Promise<readonly MediaItem[]> {
    const album = await getMediaObject<MediaAlbum>(`apple:albums:${id}`, true);
    const tracks = await fetchAllTracks(album);
    album.pager.disconnect();
    return tracks;
}

let appleGenres: readonly MediaFilter[];

async function getFilters(filterType: FilterType): Promise<readonly MediaFilter[]> {
    if (filterType === FilterType.ByGenre) {
        if (!appleGenres) {
            const musicKit = MusicKit.getInstance();
            const {
                data: {data},
            } = await musicKit.api.music('/v1/catalog/{{storefrontId}}/genres', {
                limit: 200,
            });
            appleGenres = data
                .map(({id, attributes}: any) => ({
                    id,
                    title: attributes.parentId ? attributes.name : '(all)',
                }))
                .sort((a: MediaFilter, b: MediaFilter) => {
                    return a.title.localeCompare(b.title);
                });
        }
        return appleGenres;
    } else {
        throw Error('Not supported');
    }
}

async function getMediaObject<T extends MediaObject>(src: string, keepAlive?: boolean): Promise<T> {
    src = getSrcFromUrl(src);
    const [, type, id] = src.split(':');
    const isLibraryItem = type.startsWith('library-');
    const path = isLibraryItem ? '/v1/me/library' : '/v1/catalog/{{storefrontId}}';
    const pager = new MusicKitPager<T>(
        `${path}/${type.replace('library-', '')}/${id}${isLibraryItem ? '/catalog' : ''}`,
        isLibraryItem
            ? undefined
            : {[`omit[resource:${type.replace('library-', '')}]`]: 'relationships'},
        {lookup: true, pageSize: 0}
    );
    return fetchFirstItem<T>(pager, {timeout: 2000, keepAlive});
}

async function getPlaybackType(): Promise<PlaybackType> {
    return PlaybackType.HLS;
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
    const pager = createSearchPager<MediaItem>(ItemType.Media, `${title} ${artist}`, undefined, {
        pageSize: limit,
        maxSize: limit,
        lookup: true,
    });
    const items = await fetchFirstPage(pager, {timeout});
    return items.filter((item) => !item.unplayable);
}

async function lookupByISRC(
    isrcs: readonly string[],
    limit?: number,
    timeout?: number
): Promise<readonly MediaItem[]> {
    if (isrcs.length === 0) {
        return [];
    }
    // https://developer.apple.com/documentation/applemusicapi/get_multiple_catalog_songs_by_isrc
    const pager = new MusicKitPager<MediaItem>(
        '/v1/catalog/{{storefrontId}}/songs',
        {'filter[isrc]': isrcs.slice(0, 25).join(',')},
        {pageSize: limit, maxSize: limit, lookup: true}
    );
    const items = await fetchFirstPage(pager, {timeout});
    return items.filter((item) => !item.unplayable);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const musicKit = MusicKit.getInstance();
    const [, type] = item.src.split(':');
    const kind = type.replace('library-', '');
    const id = item.apple?.catalogId;
    const path = `/v1/me/library`;

    if (inLibrary) {
        const key = `ids[${kind}]`;
        return musicKit.api.music(path, {[key]: id}, {fetchOptions: {method: 'POST'}});
    } else {
        // This doesn't currently work.
        // https://developer.apple.com/forums/thread/107807
        return musicKit.api.music(`${path}/${kind}/${id}`, undefined, {
            fetchOptions: {method: 'DELETE'},
        });
    }
}

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>,
    filters?: MusicKit.QueryParameters,
    options?: Partial<PagerConfig>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: props.title,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q, filters, options);
        },
    };
}

function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    filters?: MusicKit.QueryParameters,
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        const params: MusicKit.QueryParameters = {...filters, term: q};
        if (!params.types) {
            switch (itemType) {
                case ItemType.Media:
                    params.types = 'songs';
                    break;

                case ItemType.Album:
                    params.types = 'albums';
                    break;

                case ItemType.Artist:
                    params.types = 'artists';
                    break;

                case ItemType.Playlist:
                    params.types = 'playlists';
                    break;
            }
            params[`omit[resource:${params.types}]`] = 'relationships';
        }
        const type = params.types;
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/search',
            params,
            {maxSize: 250, pageSize: 25, ...options},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results[type] || {data: []};
                const nextPageUrl = result.next;
                const total = response.meta?.total;
                return {items: result.data, total, nextPageUrl};
            }
        );
    } else {
        return new SimplePager<T>();
    }
}

export async function addUserData<T extends MediaObject>(
    items: readonly T[],
    inline = false,
    parent?: ParentOf<T>
): Promise<void> {
    const isAlbumTrack = parent?.itemType === ItemType.Album;
    items = items.filter(
        (item) =>
            item.inLibrary === undefined &&
            !(isAlbumTrack && item.src.startsWith('apple:library-')) &&
            !!item.apple?.catalogId
    );
    const [item] = items;
    if (!item || !apple.canStore?.(item, inline)) {
        return;
    }
    const [, type] = item.src.split(':');
    const ids: string[] = items.map((item) => item.apple!.catalogId);
    const inLibrary = await getInLibrary(type, ids);
    dispatchMediaObjectChanges<MediaObject>(
        ids.map((id, index) => ({
            match: (object: MediaObject) => object.apple?.catalogId === id,
            values: {inLibrary: inLibrary[index]},
        }))
    );
}

async function getInLibrary(
    type: string,
    catalogIds: readonly string[]
): Promise<readonly boolean[]> {
    if (catalogIds.length === 0) {
        return [];
    }
    type = type.replace('library-', '');
    const musicKit = MusicKit.getInstance();
    const {
        data: {resources},
    } = await musicKit.api.music('/v1/catalog/{{storefrontId}}', {
        [`fields[${type}]`]: 'inLibrary',
        'format[resources]': 'map',
        [`ids[${type}]`]: catalogIds,
        'omit[resource]': 'autos',
    });
    const data = resources[type];
    if (data) {
        const inLibrary = new Map<string, boolean>(
            Object.keys(data).map((key) => [key, data[key].attributes.inLibrary])
        );
        return catalogIds.map((id) => !!inLibrary.get(id));
    } else {
        return catalogIds.map(() => false);
    }
}
