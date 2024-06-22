import {Except, Writable} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import Pin from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ViewType from 'types/ViewType';
import {NoFavoritesPlaylistError} from 'services/errors';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {t} from 'services/i18n';
import {bestOf} from 'utils';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './appleAuth';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';
import appleSettings from './appleSettings';

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
    fields: ['Index', 'Thumbnail', 'Title', 'Artist'],
};

const appleRecommendations: MediaSource<MediaPlaylist> = {
    id: 'apple/recommendations',
    title: 'Recommended',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            `/v1/me/recommendations`,
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
        return new MusicKitPager(`/v1/me/recent/played/tracks`, undefined, {
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

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/library/songs`, {
            'include[library-songs]': 'catalog',
        });
    },
};

const appleLibraryAlbums: MediaSource<MediaAlbum> = {
    id: 'apple/library-albums',
    title: 'My Albums',
    icon: 'tick',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        return new MusicKitPager(`/v1/me/library/albums`, {
            'fields[library-albums]': 'name,artistName,playParams',
            'include[library-albums]': 'catalog',
            sort: '-dateAdded',
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
        return new MusicKitPager(`/v1/me/library/artists`, {
            'fields[library-artists]': 'name,playParams',
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

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(`/v1/me/library/playlists`, {
            'fields[library-playlists]': 'name,playParams,artwork',
            'include[library-playlists]': 'catalog',
            sort: '-dateAdded',
        });
    },
};

const appleEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: 'apple/editable-playlists',
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(`/v1/me/library/playlists`, {
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

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/library/music-videos`);
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
    viewType: ViewType.ByGenre,
    layout: chartsLayoutLarge,

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
    viewType: ViewType.ByGenre,
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
    viewType: ViewType.ByGenre,
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
    primaryMediaType: MediaType.Audio,
    defaultHidden: true,
    internetRequired: true,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists'}),
        createRoot<MediaItem>(
            ItemType.Media,
            {title: 'Videos', layout: defaultLayout, mediaType: MediaType.Video},
            {types: 'music-videos'},
            {maxSize: 250}
        ),
    ],
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
    addToPlaylist,
    canRate: () => false,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMetadata,
    getPlaybackType,
    lookup,
    lookupByISRC,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default apple;

export function isMusicKitBeta(): boolean | undefined {
    return window.MusicKit?.version.startsWith('3');
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
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
    const playlist = await musicKit.api.music('/v1/me/library/playlists', undefined, {
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
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const [, type, id] = pin.src.split(':');
            const isLibraryItem = type.startsWith('library-');
            const path = isLibraryItem ? `/v1/me/library` : `/v1/catalog/{{storefrontId}}`;
            return new MusicKitPager(
                `${path}/playlists/${id}`,
                isLibraryItem
                    ? {
                          'include[library-playlists]': 'catalog',
                          'fields[library-playlists]': 'name,playParams',
                      }
                    : {
                          'omit[resource:playlists]': 'relationships',
                      }
            );
        },
    };
}

let appleGenres: readonly MediaFilter[];

async function getFilters(
    viewType: ViewType.ByDecade | ViewType.ByGenre
): Promise<readonly MediaFilter[]> {
    if (viewType === ViewType.ByGenre) {
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

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (item.itemType === ItemType.Album && item.synthetic) {
        return item;
    }
    let result: Writable<T> = item as Writable<T>;
    const hasMetadata = !!item.externalUrl; // this field is not available on library items
    if (!hasMetadata) {
        const [, type, id] = item.src.split(':');
        const isLibraryItem = type.startsWith('library-');
        const path = isLibraryItem ? `/v1/me/library` : `/v1/catalog/{{storefrontId}}`;
        const pager = new MusicKitPager<T>(
            `${path}/${type.replace('library-', '')}/${id}${isLibraryItem ? '/catalog' : ''}`,
            isLibraryItem
                ? undefined
                : {[`omit[resource:${type.replace('library-', '')}]`]: 'relationships'},
            {lookup: true}
        );
        const items = await fetchFirstPage<T>(pager, {timeout: 2000});
        result = bestOf(item, items[0]) as Writable<T>;
        result.description = items[0]?.description || item.description;
    }
    result.inLibrary = actionsStore.getInLibrary(result as T, result.inLibrary);
    if (result.inLibrary === undefined) {
        addUserData([result as T]);
    }
    return result as T;
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
    const pager = createSearchPager<MediaItem>(ItemType.Media, `${artist} ${title}`, undefined, {
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
        `/v1/catalog/{{storefrontId}}/songs`,
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

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>,
    filters?: MusicKit.QueryParameters,
    options?: Partial<PagerConfig>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `apple/search/${props.title.toLowerCase()}`,
        icon: 'search',
        searchable: true,

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
    const item = items[0];
    if (!item || !apple.canStore(item, inline)) {
        return;
    }
    const isAlbumTrack = parent?.itemType === ItemType.Album;
    const ids: string[] = items
        .filter(
            (item) =>
                item.inLibrary === undefined &&
                !(isAlbumTrack && item.src.startsWith('apple:library-'))
        )
        .map((item) => item.apple?.catalogId)
        .filter((catalogId) => !!catalogId) as string[];

    if (ids.length === 0) {
        return;
    }

    let [, type] = item.src.split(':');
    type = type.replace('library-', '');
    const musicKit = MusicKit.getInstance();
    const {
        data: {resources},
    } = await musicKit.api.music(`/v1/catalog/{{storefrontId}}`, {
        [`fields[${type}]`]: 'inLibrary',
        'format[resources]': 'map',
        [`ids[${type}]`]: ids,
        'omit[resource]': 'autos',
    });
    const data = resources[type];

    if (!data) {
        return;
    }

    const inLibrary = new Map<string, boolean>(
        Object.keys(data).map((key) => [key, data[key].attributes.inLibrary])
    );

    dispatchMediaObjectChanges<MediaObject>(
        ids.map((id) => ({
            match: (object: MediaObject) => object.apple?.catalogId === id,
            values: {inLibrary: !!inLibrary.get(id)},
        }))
    );
}
