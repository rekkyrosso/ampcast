import {map, mergeMap} from 'rxjs';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import FilterType from 'types/FilterType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import PersonalMediaService from 'types/PersonalMediaService';
import Pin, {Pinnable} from 'types/Pin';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import {Logger} from 'utils';
import {observeListen} from 'services/localdb/listens';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './ibroadcastAuth';
import ibroadcastLibrary from './ibroadcastLibrary';
import ibroadcastSources, {
    ibroadcastPlaylistItems,
    ibroadcastPlaylistItemsSort,
    ibroadcastPlaylistLayout,
    ibroadcastPlaylists,
    ibroadcastSearch,
} from './ibroadcastSources';
import IBroadcastPager from './IBroadcastPager';
import ibroadcastSettings from './ibroadcastSettings';
import {createPlaylistItemsPager, getIdFromSrc, getLibrarySectionFromItem} from './ibroadcastUtils';
import Credentials from './components/IBroadcastCredentials';
import Login from './components/IBroadcastLogin';
import ServerSettings from './components/IBroadcastServerSettings';

const serviceId: MediaServiceId = 'ibroadcast';
const streamingHost = '//streaming.ibroadcast.com';

const logger = new Logger(serviceId);

const ibroadcast: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'iBroadcast',
    url: 'https://ibroadcast.com/',
    host: 'https://media.ibroadcast.com',
    serviceType: ServiceType.PersonalMedia,
    Components: {Credentials, Login, ServerSettings},
    internetRequired: true,
    secureContextRequired: true,
    credentialsRequired: true,
    get credentialsLocked(): boolean {
        return ibroadcastSettings.credentialsLocked;
    },
    credentialsUrl: 'https://help.ibroadcast.com/developer/quick-start',
    editablePlaylists: ibroadcastPlaylists,
    root: ibroadcastSearch,
    sources: ibroadcastSources,
    get libraryId(): string {
        return ibroadcastLibrary.id;
    },
    observeLibraryId: () => ibroadcastLibrary.observeId(),
    addMetadata,
    addToPlaylist,
    canPin,
    canRate,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    deletePlaylist,
    editPlaylist,
    getFilters,
    getPlayableUrl,
    getPlaybackType,
    getPlaylistByName,
    movePlaylistItems,
    rate,
    removePlaylistItems,
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
    scrobble,
};

export default ibroadcast;

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const id = getIdFromSrc(item);
    const section = getLibrarySectionFromItem(item) as iBroadcast.RateableLibrarySection;
    const library = await ibroadcastLibrary.load();
    const data = library[section];
    const entry = data[id];
    if (entry) {
        const rating = entry[data.map.rating];
        return {...item, rating};
    }
    return item;
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[],
    position?: number
): Promise<void> {
    const id = getIdFromSrc(playlist);
    return ibroadcastLibrary.addToPlaylist(id, items.map(getIdFromSrc), position);
}

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canRate<T extends MediaObject>(item: T): boolean {
    return item.itemType !== ItemType.Playlist;
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', isPublic = false, items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    return ibroadcastLibrary.createPlaylist(name, description, isPublic, items.map(getIdFromSrc));
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
        primaryItems: {
            layout: ibroadcastPlaylistLayout,
        },
        secondaryItems: ibroadcastPlaylistItems,

        search(): Pager<MediaPlaylist> {
            const pinId = getIdFromSrc(pin);
            return new IBroadcastPager(
                'playlists',
                () =>
                    ibroadcastLibrary.query({
                        section: 'playlists',
                        filter: (_, map, library, id) => id == pinId,
                    }),
                {
                    childSort: ibroadcastPlaylistItemsSort.defaultSort,
                    childSortId: `${serviceId}/pinned-playlist/2`,
                },
                createPlaylistItemsPager
            );
        },
    } as MediaSource<T>;
}

async function deletePlaylist(playlist: MediaPlaylist): Promise<void> {
    const id = getIdFromSrc(playlist);
    return ibroadcastLibrary.deletePlaylist(id);
}

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    await ibroadcastLibrary.editPlaylist(playlist);
    return playlist;
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    const section = itemType === ItemType.Album ? 'albums' : 'tracks';
    switch (filterType) {
        case FilterType.ByDecade:
            return ibroadcastLibrary.getDecades(section);

        case FilterType.ByGenre:
            return ibroadcastLibrary.getGenres(section);

        default:
            throw Error('Not supported');
    }
}

function getPlayableUrl(item: PlayableItem): string {
    const {token, userId, bitrate: bitRate} = ibroadcastSettings;
    if (token && userId) {
        const id = getIdFromSrc(item);
        const fileName = (item.fileName || '').replace('128', bitRate);
        const params = new URLSearchParams({
            Expires: String(Math.floor(Date.now() / 1000)),
            Signature: token.access_token,
            file_id: String(id),
            user_id: userId,
            platform: __app_name__,
            version: __app_version__,
        });
        return `${location.protocol}${streamingHost}${fileName}?${params}`;
    } else {
        throw Error('Not logged in');
    }
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    try {
        const url = getPlayableUrl(item);
        return url.includes('/hls') ? PlaybackType.HLS : PlaybackType.Direct;
    } catch {
        return PlaybackType.Direct;
    }
}

async function getPlaylistByName(name: string): Promise<MediaPlaylist | undefined> {
    return ibroadcastLibrary.getPlaylistByName(name);
}

async function movePlaylistItems(
    playlist: MediaPlaylist,
    items: readonly MediaItem[],
    toIndex: number
): Promise<void> {
    const id = getIdFromSrc(playlist);
    return ibroadcastLibrary.movePlaylistTracks(id, items.map(getIdFromSrc), toIndex);
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    const id = getIdFromSrc(item);
    switch (item.itemType) {
        case ItemType.Album:
            return ibroadcastLibrary.rateAlbum(id, rating);

        case ItemType.Artist:
            return ibroadcastLibrary.rateArtist(id, rating);

        case ItemType.Media:
            return ibroadcastLibrary.rateTrack(id, rating);
    }
}

async function removePlaylistItems(
    playlist: MediaPlaylist,
    items: readonly MediaItem[]
): Promise<void> {
    const id = getIdFromSrc(playlist);
    return ibroadcastLibrary.removePlaylistTracks(id, items.map(getIdFromSrc));
}

function scrobble(): void {
    observeListen()
        .pipe(
            map((listen) => getIdFromSrc(listen)),
            mergeMap((id) => ibroadcastLibrary.scrobble(id))
        )
        .subscribe(logger);
}
