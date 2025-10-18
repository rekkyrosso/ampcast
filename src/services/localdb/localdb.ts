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
    localPlaylists,
    localScrobbles,
} from './localSources';
import playlists from './playlists';

const serviceId: MediaServiceId = 'localdb';

const localdb: DataService = {
    ...noAuth(true),
    id: serviceId,
    name: 'Local DB',
    icon: serviceId,
    url: '',
    serviceType: ServiceType.DataService,
    defaultHidden: false,
    root: localScrobbles,
    sources: localSources,
    editablePlaylists: localPlaylists,
    addToPlaylist,
    canPin,
    compareForRating: () => false,
    createPlaylist,
    createSourceFromPin,
};

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    return playlists.addToPlaylist(playlist, items);
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
        secondaryItems: localPlaylistItems,

        search(): Pager<MediaPlaylist> {
            return playlists.createPager(
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

export default localdb;
