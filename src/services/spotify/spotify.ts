import {mergeMap, skipWhile, take, tap} from 'rxjs';
import SpotifyWebApi from 'spotify-web-api-js';
import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {LiteStorage, Logger} from 'utils';
import {
    observeAccessToken,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
    refreshToken,
} from './spotifyAuth';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';

console.log('module::spotify');

const logger = new Logger('spotify');

export const spotifySettings = new LiteStorage('spotify');

export const spotifyApi = new SpotifyWebApi();

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
    defaultHidden: true,

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
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getMySavedTracks({offset, limit, market});
            return {items: items.map((item) => item.track), total, next};
        });
    },
};

const spotifyLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'spotify/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,

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
            {calculatePageSize: true}
        );
    },
};

const spotifyPlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getUserPlaylists(undefined, {
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyPlaylist[], total, next};
        });
    },
};

const spotifyFeaturedPlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/featured-playlists',
    title: 'Featured Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    defaultHidden: true,
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

const spotify: MediaService = {
    id: 'spotify',
    name: 'Spotify',
    icon: 'spotify',
    url: 'https://www.spotify.com/',
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
        spotifyRecentlyPlayed,
        spotifyTopTracks,
        spotifyTopArtists,
        spotifyPlaylists,
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
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default spotify;

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
    const hasMetadata = item.inLibrary !== undefined;
    if (hasMetadata || !canStore(item)) {
        return item;
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
                spotifySettings.getString('userId'),
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
    const [, , id] = item.src.split(':');

    const updateLibrary = async () => {
        switch (item.itemType) {
            case ItemType.Album:
                if (inLibrary) {
                    await spotifyApi.addToMySavedAlbums([id]);
                } else {
                    await spotifyApi.removeFromMySavedAlbums([id]);
                }
                break;

            case ItemType.Media:
                if (inLibrary) {
                    await spotifyApi.addToMySavedTracks([id]);
                } else {
                    await spotifyApi.removeFromMySavedTracks([id]);
                }
                break;

            case ItemType.Playlist:
                if (inLibrary) {
                    await spotifyApi.followPlaylist(id);
                } else {
                    await spotifyApi.unfollowPlaylist(id);
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

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: String(itemType),
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
        return new SpotifyPager(getFetch(itemType, q), {maxSize: 250, ...options});
    } else {
        return new SimplePager<T>();
    }
}

function getFetch(
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
            throw TypeError('Fetch not supported for this type of media.');
    }
}

function getMarket(): string {
    return spotifySettings.getString('market');
}

observeAccessToken().subscribe((token) => spotifyApi.setAccessToken(token));

if (!getMarket()) {
    observeAccessToken()
        .pipe(
            skipWhile((token) => !token),
            mergeMap(() => spotifyApi.getMe()),
            tap((me) => {
                spotifySettings.setString('userId', me.id);
                spotifySettings.setString('market', me.country);
            }),
            take(1)
        )
        .subscribe(logger);
}
