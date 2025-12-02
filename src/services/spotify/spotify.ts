import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import Pin, {Pinnable} from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {chunk} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import fetchAllTracks from 'services/pagers/fetchAllTracks';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout, reconnect} from './spotifyAuth';
import spotifyApi, {spotifyApiCallWithRetry} from './spotifyApi';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';
import spotifySettings from './spotifySettings';
import spotifySources, {
    createSearchPager,
    spotifyEditablePlaylists,
    spotifySearch,
} from './spotifySources';
import {getMarket} from './spotifyUtils';
import Credentials from './components/SpotifyCredentials';
import Login from './components/SpotifyLogin';
import './bootstrap';

const serviceId: MediaServiceId = 'spotify';

const spotify: PublicMediaService = {
    id: serviceId,
    name: 'Spotify',
    icon: serviceId,
    url: 'https://www.spotify.com',
    credentialsUrl: 'https://developer.spotify.com/dashboard',
    serviceType: ServiceType.PublicMedia,
    Components: {Credentials, Login},
    internetRequired: true,
    secureContextRequired: true,
    credentialsRequired: true,
    get credentialsLocked(): boolean {
        return spotifySettings.credentialsLocked;
    },
    editablePlaylists: spotifyEditablePlaylists,
    root: spotifySearch,
    sources: spotifySources,
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
    canPin,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    editPlaylist,
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
    reconnect,
};

export default spotify;

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T, inListView?: boolean): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

        case ItemType.Artist:
        case ItemType.Media:
            return true;

        case ItemType.Playlist:
            return !item.owned && !inListView;

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

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    const [, , playlistId] = playlist.src.split(':');
    await spotifyApi.changePlaylistDetails(playlistId, {
        name: playlist.title,
        description: playlist.description || '',
        public: !!playlist.public,
    });
    return playlist;
}

function createSourceFromPin<T extends Pinnable>(pin: Pin): MediaSource<T> {
    if (pin.itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    return {
        title: pin.title,
        itemType: pin.itemType,
        id: pin.src,
        sourceId: `${serviceId}/pinned-playlist`,
        icon: 'pin',
        isPin: true,

        search(): Pager<T> {
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
    if (src.startsWith(`${serviceId}:`)) {
        return src;
    }
    const url = new URL(src);
    const [id, type] = url.pathname.split('/').reverse();
    return `${serviceId}:${type}:${id}`;
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
    const album = await getMediaObject<MediaAlbum>(`${serviceId}:album:${id}`, true);
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
        {pageSize: limit, maxSize: limit, passive: true}
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
        {pageSize: limit, maxSize: limit, passive: true}
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
