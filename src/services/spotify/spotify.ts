import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {observeIsLoggedIn, isLoggedIn, login, logout, refreshToken} from './spotifyAuth';
import spotifyApi from './spotifyApi';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';
import {userSettings} from './spotifySettings';
import {chunk} from 'utils';

export type SpotifyArtist = SpotifyApi.ArtistObjectFull;
export type SpotifyAlbum = SpotifyApi.AlbumObjectFull;
export type SpotifyPlaylist = SpotifyApi.PlaylistObjectFull;
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

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration'],
};

const spotifyRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'spotify/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    defaultHidden: true,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total} = await spotifyApi.getMyRecentlyPlayedTracks({
                    limit,
                });
                return {
                    items: items.map(
                        (item) => ({played_at: item.played_at, ...item.track} as SpotifyTrack)
                    ),
                    total,
                    next: undefined, // deliberately ignore this
                };
            },
            {maxSize: 50, pageSize: 50}
        );
    },
};

const spotifyTopTracks: MediaSource<MediaItem> = {
    id: 'spotify/top-tracks',
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            return spotifyApi.getMyTopTracks({offset, limit});
        });
    },
};

const spotifyTopArtists: MediaSource<MediaArtist> = {
    id: 'spotify/top-artists',
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,

    search(): Pager<MediaArtist> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            return spotifyApi.getMyTopArtists({offset, limit});
        });
    },
};

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
                return {items: items.map((item) => item.track), total, next};
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
                return {items: items.map((item) => item.album), total, next};
            },
            {calculatePageSize: true},
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
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getUserPlaylists(undefined, {
                    offset,
                    limit,
                    market,
                });
                return {items: items as SpotifyPlaylist[], total, next};
            },
            undefined,
            true
        );
    },
};

const spotifyFeaturedPlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/featured-playlists',
    title: 'Recommended',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

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

const spotify: PublicMediaService = {
    id: 'spotify',
    name: 'Spotify',
    icon: 'spotify',
    url: 'https://www.spotify.com',
    serviceType: ServiceType.PublicMedia,
    defaultHidden: true,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {
            title: 'Playlists',
            secondaryLayout: playlistItemsLayout,
        }),
    ],
    sources: [
        spotifyLikedSongs,
        spotifyLikedAlbums,
        spotifyPlaylists,
        spotifyRecentlyPlayed,
        spotifyTopTracks,
        spotifyTopArtists,
        spotifyFeaturedPlaylists,
    ],
    icons: {
        [Action.AddToLibrary]: 'heart',
        [Action.RemoveFromLibrary]: 'heart-fill',
    },
    labels: {
        [Action.AddToLibrary]: 'Add to Spotify Library',
        [Action.RemoveFromLibrary]: 'Remove from Spotify Library',
    },
    canRate: () => false,
    canStore,
    compareForRating,
    createSourceFromPin,
    getMetadata,
    lookup,
    store,
    bulkStore,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default spotify;

function canStore<T extends MediaObject>(item: T, inline?: boolean): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

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
                return {items: [playlist], total: 1};
            });
        },
    };
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const [, , id] = item.src.split(':');
    switch (item.itemType) {
        case ItemType.Album: {
            const [inLibrary] = await spotifyApi.containsMySavedAlbums([id]);
            return {...item, inLibrary};
        }

        case ItemType.Media: {
            const [inLibrary] = await spotifyApi.containsMySavedTracks([id]);
            return {...item, inLibrary};
        }

        case ItemType.Playlist: {
            const [inLibrary] = await spotifyApi.areFollowingPlaylist(id, [
                userSettings.getString('userId'),
            ]);
            return {...item, inLibrary};
        }

        default:
            return item;
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
    const safeString = (s: string) => s.replace(/['"]/g, ' ');
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, lookup: true};
    const pager = createSearchPager<MediaItem>(
        ItemType.Media,
        `${safeString(artist)} ${safeString(title)}`,
        options
    );
    return fetchFirstPage(pager, {timeout});
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    return storeMany([item], inLibrary);
}

async function bulkStore(items: readonly MediaObject[], inLibrary: boolean): Promise<void> {
    const item = items[0];
    if (!item) {
        return;
    }
    let chunkSize = 0;
    switch (item.itemType) {
        case ItemType.Media:
            chunkSize = 500;
            break;

        case ItemType.Album:
            chunkSize = 200;
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
    const item = items[0];
    if (!item) {
        return;
    }
    const ids = items.map((item) => {
        const [, , id] = item.src.split(':');
        return id;
    });

    const updateLibrary = async () => {
        switch (item.itemType) {
            case ItemType.Album:
                if (inLibrary) {
                    await Promise.all(
                        chunk(ids, 20).map((ids) => spotifyApi.addToMySavedAlbums(ids))
                    );
                } else {
                    await Promise.all(
                        chunk(ids, 20).map((ids) => spotifyApi.removeFromMySavedAlbums(ids))
                    );
                }
                break;

            case ItemType.Media:
                if (inLibrary) {
                    await Promise.all(
                        chunk(ids, 50).map((ids) => spotifyApi.addToMySavedTracks(ids))
                    );
                } else {
                    await Promise.all(
                        chunk(ids, 50).map((ids) => spotifyApi.removeFromMySavedTracks(ids))
                    );
                }
                break;

            case ItemType.Playlist:
                if (inLibrary) {
                    await Promise.all(ids.map((id) => spotifyApi.followPlaylist(id)));
                } else {
                    await Promise.all(ids.map((id) => spotifyApi.unfollowPlaylist(id)));
                }
                break;
        }
    };

    try {
        await updateLibrary();
    } catch (err: any) {
        if (err.status === 401) {
            await refreshToken();
            await updateLibrary();
        } else {
            throw err;
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
        id: `spotify/search/${props.title.toLowerCase()}`,
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
    return userSettings.getString('market');
}
