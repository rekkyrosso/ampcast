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
import {
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
import {createPlaylistItemsPager} from './ibroadcastUtils';
import Credentials from './components/IBroadcastCredentials';
import Login from './components/IBroadcastLogin';
import ServerSettings from './components/IBroadcastServerSettings';

const serviceId: MediaServiceId = 'ibroadcast';
const streamingHost = 'https://streaming.ibroadcast.com';

const ibroadcast: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'iBroadcast',
    url: 'https://ibroadcast.com/',
    host: 'https://media.ibroadcast.com',
    serviceType: ServiceType.PersonalMedia,
    Components: {Credentials, Login, ServerSettings},
    internetRequired: true,
    get credentialsLocked(): boolean {
        return ibroadcastSettings.credentialsLocked;
    },
    credentialsRequired: true,
    credentialsUrl: 'https://help.ibroadcast.com/developer/quick-start',
    editablePlaylists: ibroadcastPlaylists,
    root: ibroadcastSearch,
    sources: ibroadcastSources,
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
    rate,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default ibroadcast;

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    const playlistId = getIdFromSrc(playlist);
    return ibroadcastLibrary.addToPlaylist(playlistId, items.map(getIdFromSrc));
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
    return ibroadcastLibrary.createPlaylist(
        name,
        description,
        isPublic,
        items.map(getIdFromSrc)
    );
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
    const {token, userId, bitRate} = ibroadcastSettings;
    if (token && userId) {
        const [, , id] = item.src.split(':');
        const fileName = (item.fileName || '').replace('128', bitRate);
        const params = new URLSearchParams({
            Expires: String(Math.floor(Date.now() / 1000)),
            Signature: token.access_token,
            file_id: id,
            user_id: userId,
            platform: __app_name__,
            version: __app_version__,
        });
        return `${streamingHost}${fileName}?${params}`;
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

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
