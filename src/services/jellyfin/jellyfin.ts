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
import {isStartupService} from 'services/buildConfig';
import embyScrobbler from 'services/emby/embyScrobbler';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import {bestOf} from 'services/metadata';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout, reconnect} from './jellyfinAuth';
import jellyfinSettings from './jellyfinSettings';
import JellyfinPager from './JellyfinPager';
import jellyfinApi from './jellyfinApi';
import jellyfinSources, {
    createItemsPager,
    createSearchPager,
    jellyfinEditablePlaylists,
    jellyfinSearch,
} from './jellyfinSources';

const serviceId: MediaServiceId = 'jellyfin';

const jellyfin: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Jellyfin',
    url: 'https://jellyfin.org',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: !isStartupService(serviceId),
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

export default jellyfin;

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
    return jellyfinApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await jellyfinApi.createPlaylist(name, description, items.map(getIdFromSrc));
    return {
        src: `jellyfin:playlist:${playlist.Id}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items.length,
    };
}

function createSourceFromPin<T extends Pinnable>(pin: Pin): MediaSource<T> {
    if (pin.itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    return {
        title: pin.title,
        itemType: pin.itemType,
        layout: {
            view: 'card',
            fields: ['Thumbnail', 'PinTitle', 'TrackCount', 'Genre', 'Progress'],
        },
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<T> {
            return createItemsPager({
                ids: getIdFromSrc(pin),
                IncludeItemTypes: 'Playlist',
            });
        },
    };
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return jellyfinApi.getFilters(filterType, itemType);
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
    const pager = new JellyfinPager<T>(`Users/${jellyfinSettings.userId}/Items/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    return fetchFirstItem<T>(pager, {timeout: 2000});
}

function getPlayableUrl(item: PlayableItem): string {
    return jellyfinApi.getPlayableUrl(item);
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
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, lookup: true};
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
