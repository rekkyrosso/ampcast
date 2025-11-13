import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import DataService from 'types/DataService';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import Pin, {Pinnable} from 'types/Pin';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';
import localSources, {
    localPlaylistItems,
    localPlaylistItemsSort,
    localPlaylistLayout,
    localPlaylists,
    localScrobbles,
} from './localSources';
import playlists, {LocalPlaylistItem} from './playlists';
import ManagePlaylists from './components/ManagePlaylists';

const serviceId: MediaServiceId = 'localdb';

const localdb: DataService = {
    ...noAuth(true),
    id: serviceId,
    name: 'Local DB',
    icon: serviceId,
    url: '',
    serviceType: ServiceType.DataService,
    defaultHidden: true,
    root: localScrobbles,
    sources: localSources,
    editablePlaylists: localPlaylists,
    Components: {ManagePlaylists},
    addToPlaylist,
    canPin,
    compareForRating: () => false,
    createPlaylist,
    createSourceFromPin,
    deletePlaylist,
    editPlaylist,
    getPlaylistByName,
    movePlaylistItems,
};

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[],
    position?: number
): Promise<void> {
    return playlists.addToPlaylist(playlist, items, position);
}

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    options: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    return playlists.createPlaylist(name, options);
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
            layout: localPlaylistLayout,
        },
        secondaryItems: localPlaylistItems,

        search(): Pager<MediaPlaylist> {
            return playlists.search(
                {
                    filter: (playlist) => playlist.src === pin.src,
                },
                {
                    childSort: localPlaylistItemsSort.defaultSort,
                    childSortId: `${serviceId}/pinned-playlist/2`,
                }
            );
        },
    } as MediaSource<T>;
}

async function deletePlaylist(playlist: MediaPlaylist): Promise<void> {
    return playlists.deletePlaylist(playlist);
}

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    return playlists.editPlaylist(playlist);
}

async function getPlaylistByName(name: string): Promise<MediaPlaylist | undefined> {
    return playlists.getPlaylistByName(name);
}

async function movePlaylistItems(
    playlist: MediaPlaylist,
    items: readonly MediaItem[],
    toIndex: number
): Promise<void> {
    return playlists.movePlaylistItems(playlist, items as LocalPlaylistItem[], toIndex);
}

export default localdb;
