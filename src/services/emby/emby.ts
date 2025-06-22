import type {Observable} from 'rxjs';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager, {PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import Pin, {Pinnable} from 'types/Pin';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {bestOf} from 'services/metadata';
import {isStartupService} from 'services/buildConfig';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout, reconnect} from './embyAuth';
import EmbyPager from './EmbyPager';
import embySettings from './embySettings';
import embyApi from './embyApi';
import embyScrobbler from './embyScrobbler';
import embySources, {
    createItemsPager,
    createSearchPager,
    embyEditablePlaylists,
    embyPlaylistItemsSort,
    embySearch,
} from './embySources';
import {createPlaylistItemsPager} from './embyUtils';

const serviceId: MediaServiceId = 'emby';

const emby: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Emby',
    url: 'https://emby.media',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: !isStartupService(serviceId),
    root: embySearch,
    sources: embySources,
    labels: {
        [Action.AddToLibrary]: t('Add to Emby Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Emby Favorites'),
    },
    editablePlaylists: embyEditablePlaylists,
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return embySettings.audioLibraries;
    },
    get host(): string {
        return embySettings.host;
    },
    get libraryId(): string {
        return embySettings.libraryId;
    },
    set libraryId(libraryId: string) {
        embySettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return embySettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        embySettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return embySettings.observeLibraryId();
    },
    addMetadata,
    addToPlaylist,
    canPin,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMediaObject,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    lookup,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default emby;

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

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
    return embyApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await embyApi.createPlaylist(name, description, items.map(getIdFromSrc));
    return {
        src: `${serviceId}:playlist:${playlist.Id}`,
        title: name,
        itemType: ItemType.Playlist,
        trackCount: items.length,
        pager: new SimplePager(),
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
        secondaryItems: {sort: embyPlaylistItemsSort},

        search(): Pager<MediaPlaylist> {
            return createItemsPager(
                {
                    ids: getIdFromSrc(pin),
                    IncludeItemTypes: 'Playlist',
                },
                {
                    childSort: embyPlaylistItemsSort.defaultSort,
                    childSortId: `${pin.src}/2`,
                },
                createPlaylistItemsPager
            );
        },
    } as MediaSource<T>;
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return embyApi.getFilters(filterType, itemType);
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
    const pager = new EmbyPager<T>(`Users/${embySettings.userId}/Items/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    return fetchFirstItem<T>(pager, {timeout: 2000});
}

function getPlayableUrl(item: PlayableItem): string {
    return embyApi.getPlayableUrl(item);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return embyApi.getPlaybackType(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    const system = await embyApi.getSystemInfo();
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
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, lookup: true};
    const pager = createSearchPager<MediaItem>(ItemType.Media, title, {Artists: artist}, options);
    return fetchFirstPage(pager, {timeout});
}

function scrobble(): void {
    embyScrobbler.scrobble(emby, embySettings);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const id = getIdFromSrc(item);
    const path = `Users/${embySettings.userId}/FavoriteItems/${id}`;
    if (inLibrary) {
        await embyApi.post(path);
    } else {
        await embyApi.delete(path);
    }
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
