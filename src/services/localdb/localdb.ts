import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import DataService from 'types/DataService';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';
import localSources, {createSourceFromPin, localPlaylists, localScrobbles} from './localSources';
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
