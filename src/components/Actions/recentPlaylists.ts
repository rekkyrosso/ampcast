import {Except} from 'type-fest';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import ItemsByService from 'types/ItemsByService';
import {LiteStorage, groupBy} from 'utils';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import {dispatchPlaylistItemsChange} from 'services/metadata';
import SimplePager from 'services/pagers/SimplePager';

const storage = new LiteStorage('recentPlaylists');

type RecentPlaylist = Except<MediaPlaylist, 'pager'>;

const maxRecentPlaylists = 4;

export async function addToRecentPlaylist(
    index: number,
    items: readonly MediaItem[]
): Promise<void> {
    const itemsByService = getPlaylistItemsByService(items);
    const recentPlaylists = getRecentPlaylists(itemsByService.map((items) => items.service));
    const playlist = recentPlaylists[index];
    const service = getServiceFromSrc(playlist);
    const playlistItems = itemsByService.find((items) => items.service === service)?.items || [];
    await service!.addToPlaylist!(playlist, playlistItems);
    addRecentPlaylist(playlist);
    dispatchPlaylistItemsChange('added', playlist.src, playlistItems);
}

export function addRecentPlaylist(playlist: MediaPlaylist): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {pager: _, ...recentPlaylist} = playlist;
    const [serviceId] = recentPlaylist.src.split(':');
    const recentPlaylists = storage.getJson<RecentPlaylist[]>('all', []);
    const duplicateIndex = recentPlaylists.findIndex(
        (recentPlaylist) => recentPlaylist.src === playlist.src
    );
    if (duplicateIndex !== -1) {
        recentPlaylists.splice(duplicateIndex, 1);
    }
    const isPlaylistForService = (playlist: RecentPlaylist) =>
        playlist.src.startsWith(`${serviceId}:`);
    const serviceCount = recentPlaylists.filter(isPlaylistForService).length;
    if (serviceCount === maxRecentPlaylists) {
        const index = recentPlaylists.findLastIndex(isPlaylistForService);
        recentPlaylists.splice(index, 1);
    }
    recentPlaylists.unshift(recentPlaylist);
    storage.setJson<RecentPlaylist[]>('all', recentPlaylists);
}

export function removeRecentPlaylist({src}: {src: string}): void {
    const recentPlaylists = storage.getJson<RecentPlaylist[]>('all', []);
    const index = recentPlaylists.findIndex((playlist) => playlist.src === src);
    if (index !== -1) {
        recentPlaylists.splice(index, 1);
        storage.setJson<RecentPlaylist[]>('all', recentPlaylists);
    }
}

export function updateRecentPlaylist(playlist: MediaPlaylist): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {pager: _, ...recentPlaylist} = playlist;
    const src = recentPlaylist.src;
    const recentPlaylists = storage.getJson<RecentPlaylist[]>('all', []);
    const index = recentPlaylists.findIndex((playlist) => playlist.src === src);
    if (index !== -1) {
        recentPlaylists[index] = recentPlaylist;
        storage.setJson<RecentPlaylist[]>('all', recentPlaylists);
    }
}

export function getRecentPlaylists(services: readonly MediaService[]): readonly MediaPlaylist[] {
    const serviceIds = services.map((service) => service.id);
    return storage
        .getJson<RecentPlaylist[]>('all', [])
        .filter(({src}) => {
            const [serviceId] = src.split(':');
            return serviceIds.includes(serviceId);
        })
        .slice(0, maxRecentPlaylists)
        .map((playlist) => ({...playlist, pager: new SimplePager()}));
}

export function getPlaylistItemsByService<T extends MediaItem>(
    items: readonly T[]
): readonly ItemsByService<T>[] {
    items = items.filter((item) => !item.linearType || item.linearType === LinearType.MusicTrack);

    if (items.length === 0) {
        return [];
    }

    const byService = groupBy(items, (item) => {
        const service = getServiceFromSrc(item);
        return service?.id || '';
    });

    const itemsByService = Object.keys(byService)
        .filter((id) => id !== '' && id !== 'listenbrainz')
        .map((id) => ({service: getService(id)!, items: byService[id]}))
        .filter(({service}) => !!service?.editablePlaylists);

    const listenbrainz = getService('listenbrainz');
    if (listenbrainz) {
        const foundItems = items.filter((item) => !!item.recording_mbid);
        if (foundItems.length > 0) {
            itemsByService.push({service: listenbrainz, items: foundItems});
        }
    }

    const localdb = getService('localdb');
    if (localdb) {
        itemsByService.push({service: localdb, items: items.filter((item) => !item.unplayable)});
    }

    return itemsByService
        .filter(({service}) => service.isLoggedIn())
        .sort((a, b) => b.items.length - a.items.length);
}
