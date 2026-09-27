import type {Observable} from 'rxjs';
import type {BaseItemDto} from '@jellyfin/sdk/lib/generated-client';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import Lyrics from 'types/Lyrics';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import {getMediaObjectId} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import embyScrobbler from 'services/emby/embyScrobbler';
import {createRadioStation} from 'services/mediaServices/mediaSources';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import {bestOf, findMatches} from 'services/metadata';
import WrappedPager from 'services/pagers/WrappedPager';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './jellyfinAuth';
import jellyfinSettings from './jellyfinSettings';
import JellyfinPager from './JellyfinPager';
import jellyfinApi from './jellyfinApi';
import jellyfinSources, {
    createRelatedPlaylistsSource,
    createSearchPager,
    createSourceFromObject,
    createSourceFromPin,
    jellyfinEditablePlaylists,
    jellyfinSearch,
} from './jellyfinSources';
import {createArtistVideosPager, createMediaObject, createRelatedItemsPager} from './jellyfinUtils';

const serviceId: MediaServiceId = 'jellyfin';

const jellyfin: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Jellyfin',
    url: 'https://jellyfin.org',
    serviceType: ServiceType.PersonalMedia,
    browsable: true,
    root: jellyfinSearch,
    sources: jellyfinSources,
    labels: {
        [Action.AddToLibrary]: t('Add to Jellyfin Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Jellyfin Favorites'),
    },
    editablePlaylists: jellyfinEditablePlaylists,
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return jellyfinSettings.audioLibraries;
    },
    get host(): string {
        return jellyfinSettings.host;
    },
    get libraryId(): string {
        return jellyfinSettings.libraryId;
    },
    set libraryId(libraryId: string) {
        jellyfinSettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return jellyfinSettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        jellyfinSettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return jellyfinSettings.observeLibraryId();
    },
    addMetadata,
    addToPlaylist,
    canPin,
    canStore,
    compareForRating,
    createPlaylist,
    createRadioPager,
    createRelatedItemsPager,
    createRelatedPlaylistsSource,
    createSongsPager,
    createSourceFromObject,
    createSourceFromPin,
    editPlaylist,
    getFilters,
    getLyrics,
    getMediaObject,
    getExportUrl,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    lookup,
    scrobble,
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

export default jellyfin;

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T): boolean {
    if (item.synthetic) {
        return false;
    }
    switch (item.itemType) {
        case ItemType.Media:
            return item.linearType !== LinearType.Station;

        case ItemType.Folder:
            return false;

        default:
            return true;
    }
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    const playlistId = getIdFromSrc(playlist);
    return jellyfinApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await jellyfinApi.createPlaylist(name, description, items.map(getIdFromSrc));
    return {
        src: `${serviceId}:playlist:${playlist.Id}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items.length,
    };
}

function createRadioPager(item: MediaItem): Pager<MediaItem> {
    if (item.linearType !== LinearType.Station) {
        throw Error('Not supported');
    }
    const id = getMediaObjectId(item);
    return new JellyfinPager(`Items/${id}/InstantMix`, {UserId: jellyfinSettings.userId});
}

function createSongsPager(item: MediaItem): Pager<MediaItem> {
    const songsPager = new SimpleMediaPager(async () => [item]);
    if (item.mediaType === MediaType.Video) {
        return songsPager;
    } else {
        const radiosPager = new SimpleMediaPager(async () => {
            const id = getMediaObjectId(item);
            const radio = createRadioStation({
                src: `${serviceId}:song-radio:${id}`,
                title: `${item.title} - Radio`,
                thumbnails: item.thumbnails,
            });
            return [radio];
        });
        const audiosPager = new WrappedPager(undefined, songsPager, radiosPager);
        if (jellyfinSettings.videoLibraryId) {
            const artistLink = item.links?.artists?.[0];
            if (artistLink) {
                const videosPager = new SimpleMediaPager<MediaItem>(async () => {
                    const [, , artistId] = artistLink.split(':');
                    const artistVideosPager = createArtistVideosPager(artistId);
                    const artistVideos = await fetchFirstPage(artistVideosPager);
                    return findMatches(artistVideos, item);
                });
                return new WrappedPager(undefined, audiosPager, videosPager);
            }
        }
        return audiosPager;
    }
}

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    await jellyfinApi.editPlaylist(playlist);
    return playlist;
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return jellyfinApi.getFilters(filterType, itemType);
}

async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const id = getIdFromSrc(item);
    return jellyfinApi.getLyrics(id);
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const metadata = await getMediaObject<T>(item.src);
    return bestOf(item, metadata);
}

async function getMediaObject<T extends MediaObject>(src: string): Promise<T> {
    const id = getIdFromSrc({src});
    const object = await jellyfinApi.get<BaseItemDto>(
        `Users/${jellyfinSettings.userId}/Items/${id}`
    );
    return createMediaObject(object);
}

function getPlayableUrl(item: MediaItem): string {
    return jellyfinApi.getPlayableUrl(item);
}

function getExportUrl(item: MediaItem, options: {format: 'mp3'; bitRate: number}): string {
    return jellyfinApi.getExportUrl(item, options);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return jellyfinApi.getPlaybackType(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    const system = await jellyfinApi.getSystemInfo();
    const info: Record<string, string> = {};
    if (system.ProductName) {
        info['Server type'] = system.ProductName;
    }
    info['Server version'] = system.Version || '';
    return info;
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
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, passive: true};
    const pager = createSearchPager<MediaItem>(ItemType.Media, title, {Artists: artist}, options);
    return fetchFirstPage(pager, {timeout});
}

function scrobble(): void {
    embyScrobbler.scrobble(jellyfin, jellyfinSettings);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const id = getIdFromSrc(item);
    const path = `Users/${jellyfinSettings.userId}/FavoriteItems/${id}`;
    if (inLibrary) {
        await jellyfinApi.post(path);
    } else {
        await jellyfinApi.delete(path);
    }
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
