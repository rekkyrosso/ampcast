import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import Pin, {Pinnable} from 'types/Pin';
import ServiceType from 'types/ServiceType';
import DataService from 'types/DataService';
import {isStartupService} from 'services/buildConfig';
import SimplePager from 'services/pagers/SimplePager';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './listenbrainzAuth';
import ListenBrainzPlaylistsPager from './ListenBrainzPlaylistsPager';
import {scrobble} from './listenbrainzScrobbler';
import listenbrainzSources, {
    listenbrainzPlaylists,
    listenbrainzScrobbles,
} from './listenbrainzSources';

const serviceId: MediaServiceId = 'listenbrainz';

const listenbrainz: DataService = {
    serviceType: ServiceType.DataService,
    id: serviceId,
    name: 'ListenBrainz',
    icon: serviceId,
    url: 'https://listenbrainz.org',
    canScrobble: true,
    defaultHidden: !isStartupService(serviceId),
    internetRequired: true,
    root: listenbrainzScrobbles,
    sources: listenbrainzSources,
    labels: {
        [Action.AddToLibrary]: 'Love on ListenBrainz',
        [Action.RemoveFromLibrary]: 'Unlove on ListenBrainz',
    },
    editablePlaylists: listenbrainzPlaylists,
    addToPlaylist,
    canPin,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default listenbrainz;

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T): boolean {
    return item.itemType === ItemType.Media && !!(item.recording_mbid || item.recording_msid);
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return listenbrainzApi.compareForRating(a, b);
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    return listenbrainzApi.addToPlaylist(playlist, items);
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    options: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const {playlist_mbid} = await listenbrainzApi.createPlaylist(name, options);
    return {
        src: `${serviceId}:playlist:${playlist_mbid}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: 0,
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
        sourceId: `${serviceId}/pinned-playlist`,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const [, , playlist_mbid] = pin.src.split(':');
            return new ListenBrainzPlaylistsPager(`playlist/${playlist_mbid}`, true);
        },
    } as MediaSource<T>;
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    if (canStore(item)) {
        await listenbrainzApi.store(item as MediaItem, inLibrary);
    }
}
