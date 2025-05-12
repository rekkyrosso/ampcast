import {Except} from 'type-fest';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import ItemsByService from 'types/ItemsByService';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import SimplePager from 'services/pagers/SimplePager';
import {LiteStorage, groupBy} from 'utils';

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

export function getRecentPlaylists(services: readonly MediaService[]): readonly MediaPlaylist[] {
    const serviceIds = services.map((service) => service.id);
    return storage
        .getJson<RecentPlaylist[]>('all', [])
        .filter(({src}) => {
            const [serviceId] = src.split(':');
            return (
                serviceIds.includes(serviceId) &&
                // TODO: Remove eventually (fixed version 0.9.12)
                src !== 'apple:undefined:undefined'
            );
        })
        .slice(0, maxRecentPlaylists)
        .map((playlist) => ({...playlist, pager: new SimplePager()}));
}

export function getPlaylistItemsByService<T extends MediaItem>(
    items: readonly T[]
): readonly ItemsByService<T>[] {
    items = items.filter((item) => !item.linearType || item.linearType === LinearType.MusicTrack);

    const byService = groupBy(items, (item) => {
        const service = getServiceFromSrc(item);
        return service?.id || '';
    });

    const itemsByService = Object.keys(byService)
        .filter((id) => id !== '' && id !== 'listenbrainz')
        .map((id) => ({
            service: getService(id)!,
            items: byService[id],
        }))
        .filter(({service}) => !!service?.editablePlaylists);

    itemsByService.sort((a, b) => b.items.length - a.items.length);

    const listenbrainz = getService('listenbrainz');
    if (listenbrainz) {
        const listenbrainzItems = items.filter(
            ({recording_mbid, track_mbid, isrc}) => recording_mbid || track_mbid || isrc
        );

        if (listenbrainzItems.length > 0) {
            itemsByService.push({
                service: listenbrainz,
                items: listenbrainzItems,
            });
        }
    }

    return itemsByService.filter(({service}) => service.isLoggedIn());
}
