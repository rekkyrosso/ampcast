import {Except} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {chunk, exists, partition, sleep} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import {NoSpotifyChartsError} from 'services/errors';
import fetchAllTracks from 'services/pagers/fetchAllTracks';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {setHiddenSources} from 'services/mediaServices/servicesSettings';
import {
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    refreshToken,
} from './spotifyAuth';
import spotifyApi from './spotifyApi';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';
import spotifySettings from './spotifySettings';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import Credentials from './components/SpotifyCredentials';
import Login from './components/SpotifyLogin';
import './bootstrap';

export type SpotifyArtist = SpotifyApi.ArtistObjectFull;
export type SpotifyAlbum = SpotifyApi.AlbumObjectFull;
export type SpotifyPlaylist = SpotifyApi.PlaylistObjectFull & {
    isChart?: boolean;
};
export type SpotifyTrack = SpotifyApi.TrackObjectSimplified &
    Partial<SpotifyApi.TrackObjectFull> & {
        played_at?: string; // ISO string
    };
export type SpotifyEpisode = SpotifyApi.EpisodeObjectFull & {
    played_at?: string; // ISO string
}; // TODO: get rid of this somehow
export type SpotifyItem =
    | SpotifyArtist
    | SpotifyAlbum
    | SpotifyTrack
    | SpotifyEpisode
    | SpotifyPlaylist;

export async function spotifyApiCallWithRetry<T>(call: () => Promise<T>): Promise<T> {
    try {
        return await call();
    } catch (err: any) {
        switch (err.status) {
            case 401:
                await refreshToken();
                return call();

            case 429: {
                const retryAfter = Number(err.headers?.get('Retry-After'));
                if (retryAfter && retryAfter <= 5) {
                    await sleep(retryAfter * 1000);
                    return call();
                } else {
                    throw err;
                }
            }

            default:
                throw err;
        }
    }
}

const isRestrictedApi = spotifySettings.restrictedApi;

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb', 'Progress'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration'],
};

const spotifySearch: MediaMultiSource = {
    id: 'spotify/search',
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
        createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            title: 'Playlists',
            layout: playlistLayout,
            secondaryLayout: playlistItemsLayout,
        }),
    ],
};

const spotifyRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'spotify/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new SpotifyPager(async (_, limit: number, before: string): Promise<SpotifyPage> => {
            const options: Record<string, number | string> = {limit};
            if (before) {
                options.before = before;
            }
            const {items, total, cursors} = await spotifyApi.getMyRecentlyPlayedTracks(options);
            return {
                items: items
                    .filter(exists)
                    .map((item) => ({played_at: item.played_at, ...item.track} as SpotifyTrack)),
                total,
                next: cursors?.before,
            };
        });
    },
};

// TODO: Spotify scope: 'user-top-read'.

// const spotifyTopTracks: MediaSource<MediaItem> = {
//     id: 'spotify/top-tracks',
//     title: 'Top Tracks',
//     icon: 'star',
//     itemType: ItemType.Media,
//     layout: defaultLayout,

//     search(): Pager<MediaItem> {
//         return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
//             return spotifyApi.getMyTopTracks({offset, limit});
//         });
//     },
// };

// const spotifyTopArtists: MediaSource<MediaArtist> = {
//     id: 'spotify/top-artists',
//     title: 'Top Artists',
//     icon: 'star',
//     itemType: ItemType.Artist,
//     defaultHidden: true,

//     search(): Pager<MediaArtist> {
//         return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
//             return spotifyApi.getMyTopArtists({offset, limit});
//         });
//     },
// };

const spotifyLikedSongs: MediaSource<MediaItem> = {
    id: 'spotify/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getMySavedTracks({
                    offset,
                    limit,
                    market,
                });
                return {items: items.filter(exists).map((item) => item.track), total, next};
            },
            undefined,
            true
        );
    },
};

const spotifyLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'spotify/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getMySavedAlbums({
                    offset,
                    limit,
                    market,
                });
                return {items: items.filter(exists).map((item) => item.album), total, next};
            },
            {pageSize: 20},
            true
        );
    },
};

const spotifyFollowedArtists: MediaSource<MediaArtist> = {
    id: 'spotify/followed-artists',
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,

    search(): Pager<MediaArtist> {
        return new SpotifyPager(
            async (_, limit: number, after: string): Promise<SpotifyPage> => {
                const options: Record<string, number | string> = {
                    type: 'artist',
                    limit,
                };
                if (after) {
                    options.after = after;
                }
                const {
                    artists: {items, total, cursors},
                } = await spotifyApi.getFollowedArtists(options);
                return {items, total, next: cursors?.after};
            },
            undefined,
            true
        );
    },
};

const spotifyPlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/playlists',
    title: 'My Playlists',
    icon: 'heart',
    itemType: ItemType.Playlist,
    lockActionsStore: true,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getUserPlaylists(
                    spotifySettings.userId,
                    {offset, limit, market}
                );
                return {items: items as SpotifyPlaylist[], total, next};
            },
            undefined,
            true
        );
    },
};

const spotifyEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/editable-playlists',
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        const userId = spotifySettings.userId;
        let nonEditableTotal = 0;
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getUserPlaylists(userId, {
                    offset,
                    limit,
                    market,
                });
                const [editable, nonEditable] = partition(
                    items,
                    (item) => item?.owner.id === userId
                );
                nonEditableTotal += nonEditable.length;
                return {
                    items: editable as SpotifyPlaylist[],
                    total: total - nonEditableTotal,
                    next,
                };
            },
            undefined,
            true
        );
    },
};

const spotifyFeaturedPlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/featured-playlists',
    title: 'Popular Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,
    defaultHidden: true,
    disabled: isRestrictedApi,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {
                playlists: {items, total, next},
            } = await spotifyApi.getFeaturedPlaylists({
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyPlaylist[], total, next};
        });
    },
};

const spotifyNewReleases: MediaSource<MediaAlbum> = {
    id: 'spotify/new-albums',
    title: 'New Releases',
    icon: 'album',
    itemType: ItemType.Album,
    secondaryLayout: playlistItemsLayout,
    defaultHidden: true,

    search(): Pager<MediaAlbum> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {
                albums: {items, total, next},
            } = await spotifyApi.getNewReleases({
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyAlbum[], total, next};
        });
    },
};

const spotifyPlaylistsByCategory: MediaSource<MediaPlaylist> = {
    id: 'spotify/playlists-by-category',
    title: 'Browse Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    filterType: FilterType.ByGenre,
    Component: FilterBrowser,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,
    disabled: isRestrictedApi,

    search(category?: MediaFilter): Pager<MediaPlaylist> {
        if (category) {
            const market = getMarket();
            return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    playlists: {items, total, next},
                } = await spotifyApi.getCategoryPlaylists(category.id, {
                    offset,
                    limit,
                    market,
                });
                return {items: items as SpotifyPlaylist[], total, next};
            });
        } else {
            return new SimplePager();
        }
    },
};

const spotifyCharts: MediaSource<MediaPlaylist> = {
    id: 'spotify/charts',
    title: 'Charts',
    icon: 'chart',
    itemType: ItemType.Playlist,
    secondaryLayout: {
        view: 'card small',
        fields: ['Index', 'Thumbnail', 'Title', 'Artist'],
    },
    disabled: isRestrictedApi,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        const categoryId = spotifySettings.chartsCategoryId;
        if (!categoryId) {
            throw new NoSpotifyChartsError();
        }
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {
                playlists: {items, total, next},
            } = await spotifyApi.getCategoryPlaylists(categoryId, {
                offset,
                limit,
                market,
            });
            return {
                items: items
                    .filter(exists)
                    .map((item) => ({...item, isChart: true} as SpotifyPlaylist)),
                total,
                next,
            };
        });
    },
};

const spotify: PublicMediaService = {
    id: 'spotify',
    name: 'Spotify',
    icon: 'spotify',
    url: 'https://www.spotify.com',
    credentialsUrl: 'https://developer.spotify.com/dashboard/create',
    serviceType: ServiceType.PublicMedia,
    Components: {Credentials, Login},
    get disabled(): boolean {
        return spotifySettings.disabled;
    },
    defaultHidden: true,
    internetRequired: true,
    get credentialsRequired(): boolean {
        return spotifySettings.credentialsRequired;
    },
    editablePlaylists: spotifyEditablePlaylists,
    root: spotifySearch,
    sources: [
        spotifyLikedSongs,
        spotifyLikedAlbums,
        spotifyFollowedArtists,
        spotifyPlaylists,
        spotifyRecentlyPlayed,
        // spotifyTopTracks,
        // spotifyTopArtists,
        spotifyCharts,
        spotifyFeaturedPlaylists,
        spotifyPlaylistsByCategory,
        spotifyNewReleases,
    ],
    icons: {
        [Action.AddToLibrary]: 'heart',
        [Action.RemoveFromLibrary]: 'heart-fill',
    },
    labels: {
        [Action.AddToLibrary]: 'Add to Spotify Library',
        [Action.RemoveFromLibrary]: 'Remove from Spotify Library',
    },
    addMetadata,
    addToPlaylist,
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
    bulkStore,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default spotify;

if (isRestrictedApi) {
    // These features are no longer supported by the Spotify Web API
    // https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
    setHiddenSources({
        [spotifyCharts.id]: true,
        [spotifyFeaturedPlaylists.id]: true,
        [spotifyPlaylistsByCategory.id]: true,
    });
}

function canStore<T extends MediaObject>(item: T, inline?: boolean): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

        case ItemType.Artist:
        case ItemType.Media:
            return true;

        case ItemType.Playlist:
            return !item.isOwn && !inline;

        default:
            return false;
    }
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    if (items?.length) {
        const [, , playlistId] = playlist.src.split(':');
        const chunks = chunk(items, 100);
        for (const chunk of chunks) {
            await spotifyApiCallWithRetry(() =>
                spotifyApi.addTracksToPlaylist(
                    playlistId,
                    chunk.map((item) => item.src)
                )
            );
        }
    }
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', isPublic = false, items}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const userId = spotifySettings.userId;
    const playlist = await spotifyApiCallWithRetry(() =>
        spotifyApi.createPlaylist(userId, {
            name,
            description,
            public: isPublic,
        })
    );
    if (items?.length) {
        const chunks = chunk(items, 100);
        for (const chunk of chunks) {
            await spotifyApiCallWithRetry(() =>
                spotifyApi.addTracksToPlaylist(
                    playlist.id,
                    chunk.map((item) => item.src)
                )
            );
        }
    }
    return {
        src: playlist.uri,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items?.length,
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
            const [, , id] = pin.src.split(':');
            const market = getMarket();
            return new SpotifyPager(async (): Promise<SpotifyPage> => {
                const playlist = await spotifyApi.getPlaylist(id, {
                    market,
                    fields: 'id,type,external_urls,name,description,images,owner,uri,tracks.total',
                });
                return {items: [{...playlist, isChart: pin.isChart}], total: 1};
            });
        },
    };
}

async function getFilters(filterType: FilterType): Promise<readonly MediaFilter[]> {
    if (filterType === FilterType.ByGenre) {
        return getCategories();
    } else {
        throw Error('Not supported');
    }
}

let spotifyCategories: MediaFilter[];

async function getCategories(): Promise<readonly MediaFilter[]> {
    if (!spotifyCategories) {
        const limit = 50; // max
        const locale = navigator.language.replace('-', '_');
        const {
            categories: {items, next},
        } = await spotifyApiCallWithRetry(() => spotifyApi.getCategories({limit, locale}));
        if (next) {
            const offset = limit;
            const {categories: next} = await spotifyApiCallWithRetry(() =>
                spotifyApi.getCategories({limit, locale, offset})
            );
            items.push(...next.items);
        }
        spotifyCategories = items.map(({id, name: title}: any) => ({id, title}));
        const firstCategory = spotifyCategories.shift();
        if (firstCategory) {
            spotifyCategories.sort((a: MediaFilter, b: MediaFilter) => {
                return a.title.localeCompare(b.title);
            });
            // Keep "Made For You" at the top.
            spotifyCategories.unshift(firstCategory);
        }
    }
    return spotifyCategories;
}

async function getDroppedItems(
    type: DataTransferItem['type'],
    data: string
): Promise<readonly MediaItem[]> {
    switch (type) {
        case 'text/x-spotify-tracks': {
            const trackIds = data.split(/\s+/).map((uri) => uri.split(':')[2]);
            return getTracksById(trackIds);
        }

        case 'text/uri-list': {
            const [src] = data.split(/\s+/).map((url) => getSrcFromUrl(url));
            const [, type, id] = src.split(':');
            if (type === 'album') {
                return getTracksByAlbumId(id);
            } else if (type === 'track') {
                return getTracksById([id]);
            } else {
                throw Error('Unsupported drop type.');
            }
        }

        default:
            throw Error('Unsupported drop type.');
    }
}

function getSrcFromUrl(src: string): string {
    if (src.startsWith('spotify:')) {
        return src;
    }
    const url = new URL(src);
    const [id, type] = url.pathname.split('/').reverse();
    return `spotify:${type}:${id}`;
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    let inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary === undefined) {
        const [, , id] = item.src.split(':');
        [inLibrary] = await spotifyApiCallWithRetry(async () => {
            switch (item.itemType) {
                case ItemType.Artist:
                    return spotifyApi.isFollowingArtists([id]);

                case ItemType.Album:
                    return spotifyApi.containsMySavedAlbums([id]);

                case ItemType.Media:
                    return spotifyApi.containsMySavedTracks([id]);

                case ItemType.Playlist:
                    return spotifyApi.areFollowingPlaylist(id, [spotifySettings.userId]);

                default:
                    return [];
            }
        });
    }
    return {...item, inLibrary};
}

async function getMediaObject<T extends MediaObject>(src: string, keepAlive?: boolean): Promise<T> {
    const pager = new SpotifyPager<T>(async (): Promise<SpotifyPage> => {
        const fetchItem = () => {
            const market = getMarket();
            src = getSrcFromUrl(src);
            const [, type, id] = src.split(':');
            switch (type) {
                case 'album':
                    return spotifyApi.getAlbum(id, {market});

                case 'artist':
                    return spotifyApi.getArtist(id, {market});

                case 'playlist':
                    return spotifyApi.getPlaylist(id, {market});

                case 'track':
                    return spotifyApi.getTrack(id, {market});

                default:
                    throw Error(`Unsupported type: '${type}'`);
            }
        };
        const item = await fetchItem();
        return {items: [item], total: 1, atEnd: true};
    });
    return fetchFirstItem<T>(pager, {timeout: 2000, keepAlive});
}

async function getPlaybackType(): Promise<PlaybackType> {
    return PlaybackType.IFrame;
}

async function getTracksById(trackIds: readonly string[]): Promise<readonly MediaItem[]> {
    const maxSize = 50;
    const ids = trackIds.slice(0, maxSize);
    const market = getMarket();
    const pager = new SpotifyPager<MediaItem>(
        async (): Promise<SpotifyPage> => {
            const {tracks: items} = await spotifyApi.getTracks(ids, {market});
            return {items, total: items.length};
        },
        {maxSize, pageSize: maxSize},
        true
    );
    return fetchFirstPage(pager);
}

async function getTracksByAlbumId(id: string): Promise<readonly MediaItem[]> {
    const album = await getMediaObject<MediaAlbum>(`spotify:album:${id}`, true);
    const tracks = await fetchAllTracks(album);
    album.pager.disconnect();
    return tracks;
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
    const safeString = (s: string) => s.replace(/['"]/g, ' ');
    const pager = createSearchPager<MediaItem>(
        ItemType.Media,
        `${safeString(title)} artist:${safeString(artist)}`,
        {pageSize: limit, maxSize: limit, lookup: true}
    );
    return fetchFirstPage(pager, {timeout});
}

async function lookupByISRC(
    isrcs: readonly string[],
    limit?: number,
    timeout?: number
): Promise<readonly MediaItem[]> {
    if (isrcs.length === 0) {
        return [];
    }
    const pager = createSearchPager<MediaItem>(
        ItemType.Media,
        isrcs.map((isrc) => `isrc:${isrc}`).join('+'),
        {pageSize: limit, maxSize: limit, lookup: true}
    );
    const items = await fetchFirstPage(pager, {timeout});
    return items.filter((item) => !item.unplayable);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    return storeMany([item], inLibrary);
}

async function bulkStore(items: readonly MediaObject[], inLibrary: boolean): Promise<void> {
    const [item] = items;
    if (!item) {
        return;
    }
    let chunkSize = 0;
    switch (item.itemType) {
        case ItemType.Artist:
        case ItemType.Album:
        case ItemType.Media:
            chunkSize = 500;
            break;

        case ItemType.Playlist:
            chunkSize = 10;
            break;
    }
    if (chunkSize === 0) {
        return;
    }
    const chunks = chunk(items, chunkSize);
    for (const chunk of chunks) {
        await storeMany(chunk, inLibrary);
    }
}

async function storeMany(items: readonly MediaObject[], inLibrary: boolean): Promise<void> {
    const [item] = items;
    if (!item) {
        return;
    }
    const ids = items.map((item) => {
        const [, , id] = item.src.split(':');
        return id;
    });

    const updateLibrary = async () => {
        switch (item.itemType) {
            case ItemType.Artist:
                if (inLibrary) {
                    return Promise.all(chunk(ids, 50).map((ids) => spotifyApi.followArtists(ids)));
                } else {
                    return Promise.all(
                        chunk(ids, 50).map((ids) => spotifyApi.unfollowArtists(ids))
                    );
                }

            case ItemType.Album:
                if (inLibrary) {
                    return Promise.all(
                        chunk(ids, 50).map((ids) => spotifyApi.addToMySavedAlbums({ids} as any))
                    );
                } else {
                    return Promise.all(
                        chunk(ids, 50).map((ids) =>
                            spotifyApi.removeFromMySavedAlbums({ids} as any)
                        )
                    );
                }

            case ItemType.Media:
                if (inLibrary) {
                    return Promise.all(
                        chunk(ids, 50).map((ids) => spotifyApi.addToMySavedTracks({ids} as any))
                    );
                } else {
                    return Promise.all(
                        chunk(ids, 50).map((ids) =>
                            spotifyApi.removeFromMySavedTracks({ids} as any)
                        )
                    );
                }

            case ItemType.Playlist:
                if (inLibrary) {
                    return Promise.all(ids.map((id) => spotifyApi.followPlaylist(id)));
                } else {
                    return Promise.all(ids.map((id) => spotifyApi.unfollowPlaylist(id)));
                }
        }
    };

    await spotifyApiCallWithRetry(updateLibrary);
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
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        return new SpotifyPager(search(itemType, q), {maxSize: 250, ...options});
    } else {
        return new SimplePager<T>();
    }
}

function search(
    itemType: ItemType,
    q: string
): (offset: number, limit: number) => Promise<SpotifyPage> {
    const market = getMarket();
    switch (itemType) {
        case ItemType.Media:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    tracks: {items, total, next},
                } = await spotifyApi.searchTracks(q, {offset, limit, market});
                return {items, total, next};
            };

        case ItemType.Album:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    albums: {items, total, next},
                } = await spotifyApi.searchAlbums(q, {offset, limit, market});
                return {items: items as SpotifyAlbum[], total, next};
            };

        case ItemType.Artist:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    artists: {items, total, next},
                } = await spotifyApi.searchArtists(q, {offset, limit, market});
                return {items: items as SpotifyArtist[], total, next};
            };

        case ItemType.Playlist:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    playlists: {items, total, next},
                } = await spotifyApi.searchPlaylists(q, {offset, limit, market});
                return {items: items as SpotifyPlaylist[], total, next};
            };

        default:
            throw TypeError('Search not supported for this type of media');
    }
}

function getMarket(): string {
    return spotifySettings.market;
}
