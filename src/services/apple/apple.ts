import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import Pin, {Pinnable} from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {chunk, groupBy} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import {dispatchMetadataChanges} from 'services/metadata';
import fetchAllTracks from 'services/pagers/fetchAllTracks';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './appleAuth';
import appleSettings from './appleSettings';
import appleSources, {appleEditablePlaylists, appleSearch} from './appleSources';
import Credentials from './components/AppleCredentials';
import Login from './components/AppleLogin';
import StreamingSettings from './components/AppleStreamingSettings';
import './bootstrap';

const serviceId: MediaServiceId = 'apple';

const apple: PublicMediaService = {
    id: serviceId,
    name: 'Apple Music',
    icon: serviceId,
    url: 'https://music.apple.com',
    credentialsUrl: 'https://developer.apple.com',
    serviceType: ServiceType.PublicMedia,
    internetRequired: true,
    Components: {Credentials, Login, StreamingSettings},
    get credentialsLocked(): boolean {
        return appleSettings.credentialsLocked;
    },
    credentialsRequired: true,
    root: appleSearch,
    sources: appleSources,
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
    addUserData,
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
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default apple;

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (canStore(item) && item.inLibrary === undefined) {
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
    if (items.length === 0) {
        return;
    }
    const musicKit = MusicKit.getInstance();
    const [, , id] = playlist.src.split(':');
    const tracks = items.map((item) => {
        const [, type, id] = item.src.split(':');
        return {id, type};
    });
    await musicKit.api.music(`/v1/me/library/playlists/${id}/tracks`, undefined, {
        fetchOptions: {
            method: 'POST',
            body: JSON.stringify({data: tracks}),
        },
    });
}

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Media:
            return item.linearType !== LinearType.Station;

        case ItemType.Playlist:
            return true;

        case ItemType.Album:
            return !item.synthetic;

        default:
            return false;
    }
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
        src: `${serviceId}:${playlist.type}:${playlist.id}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items.length,
    };
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
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
            const [, type, id] = pin.src.split(':');
            const isLibraryItem = type.startsWith('library-');
            const path = isLibraryItem ? '/v1/me/library' : '/v1/catalog/{{storefrontId}}';
            return new MusicKitPager(
                `${path}/playlists/${id}`,
                isLibraryItem
                    ? {
                          'include[library-playlists]': 'catalog',
                          'fields[library-playlists]': 'name,playParams,artwork,canEdit',
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
    if (src.startsWith(`${serviceId}:`)) {
        return src;
    }
    const url = new URL(src);
    const [id] = url.pathname.split('/').reverse();
    if (url.pathname.includes('/album/')) {
        const trackId = url.searchParams.get('i');
        if (trackId) {
            return `${serviceId}:songs:${trackId}`;
        } else {
            return `${serviceId}:albums:${id}`;
        }
    } else if (url.pathname.includes('/artist/')) {
        return `${serviceId}:artists:${id}`;
    } else if (url.pathname.includes('/playlist/')) {
        return `${serviceId}:playlists:${id}`;
    } else if (url.pathname.includes('/music-video/')) {
        return `${serviceId}:music-videos:${id}`;
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
    const album = await getMediaObject<MediaAlbum>(`${serviceId}:albums:${id}`);
    const tracks = await fetchAllTracks(album);
    album.pager.disconnect();
    return tracks;
}

async function getFilters(filterType: FilterType): Promise<readonly MediaFilter[]> {
    switch (filterType) {
        case FilterType.ByGenre:
        case FilterType.ByAppleStationGenre:
            return getGenres(filterType);

        default:
            throw Error('Not supported');
    }
}

let appleGenres: readonly MediaFilter[] | undefined;
let appleStationGenres: readonly MediaFilter[] | undefined;

async function getGenres(filterType: FilterType): Promise<readonly MediaFilter[]> {
    const isByStationGenre = filterType === FilterType.ByAppleStationGenre;
    let genres = isByStationGenre ? appleStationGenres : appleGenres;
    if (!genres) {
        const musicKit = MusicKit.getInstance();
        const genreType = isByStationGenre ? 'station-genres' : 'genres';
        const {
            data: {data},
        } = await musicKit.api.music(`/v1/catalog/{{storefrontId}}/${genreType}`, {
            limit: 200,
        });
        genres = data
            .map(({id, attributes, type}: any) => ({
                id,
                title: attributes.parentId || type === 'station-genres' ? attributes.name : '(all)',
            }))
            .concat(isByStationGenre ? [{id: '#live', title: 'Live Radio'}] : [])
            .sort((a: MediaFilter, b: MediaFilter) => {
                return a.title.localeCompare(b.title);
            });
        if (isByStationGenre) {
            appleStationGenres = genres;
        } else {
            appleGenres = genres;
        }
    }
    return genres || [];
}

async function getMediaObject<T extends MediaObject>(src: string): Promise<T> {
    src = getSrcFromUrl(src);
    const [, type, id] = src.split(':');
    const isLibraryItem = type.startsWith('library-');
    const path = isLibraryItem ? '/v1/me/library' : '/v1/catalog/{{storefrontId}}';
    const pager = new MusicKitPager<T>(
        `${path}/${type.replace('library-', '')}/${id}${isLibraryItem ? '/catalog' : ''}`,
        isLibraryItem
            ? undefined
            : {[`omit[resource:${type.replace('library-', '')}]`]: 'relationships'},
        {passive: true, pageSize: 0}
    );
    return fetchFirstItem<T>(pager, {timeout: 2000});
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
    const pager = new MusicKitPager<MediaItem>(
        '/v1/catalog/{{storefrontId}}/search',
        {
            types: 'songs,music-videos',
            term: `${title} ${artist}`,
        },
        {pageSize: limit, maxSize: 2 * limit, passive: true},
        undefined,
        (response: any): MusicKitPage => {
            const songs = response.results?.songs?.data || [];
            const videos = response.results?.['music-videos']?.data || [];
            const items = songs.concat(videos);
            const total = items.length;
            return {items, total, atEnd: true};
        }
    );
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
        {pageSize: limit, maxSize: limit, passive: true}
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

async function addUserData<T extends MediaObject>(items: readonly T[]): Promise<void> {
    items = items.filter(
        (item) => item.inLibrary === undefined && canStore(item) && !!item.apple?.catalogId
    );
    if (items.length > 0) {
        const getType = (item: MediaObject): string => {
            const [, type] = item.src.split(':');
            return type;
        };
        const groupedByType = groupBy(items, getType);
        await Promise.all(
            Object.keys(groupedByType).map(async (type) => {
                const ids: string[] = groupedByType[type].map((item) => item.apple!.catalogId);
                const inLibrary = await getInLibrary(type, ids);
                dispatchMetadataChanges(
                    ids.map((id, index) => ({
                        match: (object: MediaObject) => object.apple?.catalogId === id,
                        values: {inLibrary: inLibrary[index]},
                    }))
                );
            })
        );
    }
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
    const fetchMany = async (ids: readonly string[]) => {
        const {
            data: {resources},
        } = await musicKit.api.music('/v1/catalog/{{storefrontId}}', {
            [`fields[${type}]`]: 'inLibrary',
            'format[resources]': 'map',
            [`ids[${type}]`]: ids,
            'omit[resource]': 'autos',
        });
        const data = resources[type];
        if (data) {
            const inLibrary = new Map<string, boolean>(
                Object.keys(data).map((key) => [key, data[key].attributes.inLibrary])
            );
            return ids.map((id) => !!inLibrary.get(id));
        } else {
            return ids.map(() => false);
        }
    };
    const chunkSize = type.includes('playlist') ? 50 : 100;
    const chunks = chunk(catalogIds, chunkSize);
    const values = await Promise.all(chunks.map((ids) => fetchMany(ids)));
    return values.flat();
}
