import type {Observable} from 'rxjs';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager, {PagerConfig} from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import Pin, {Pinnable} from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import {getTextFromHtml, Logger} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import {bestOf} from 'services/metadata';
import {isStartupService} from 'services/buildConfig';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import subsonicScrobbler from 'services/subsonic/factory/subsonicScrobbler';
import {
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './navidromeAuth';
import NavidromeOffsetPager from './NavidromeOffsetPager';
import navidromeSettings from './navidromeSettings';
import navidromeSources, {
    navidromePlaylistItems,
    navidromePlaylistItemsSort,
    navidromePlaylists,
    navidromeSearch,
} from './navidromeSources';
import navidromeApi from './navidromeApi';
import subsonicApi from './subsonicApi';
import {createPlaylistItemsPager} from './navidromeUtils';

const serviceId: MediaServiceId = 'navidrome';

const logger = new Logger(serviceId);

const navidrome: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Navidrome',
    url: 'https://www.navidrome.org',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: !isStartupService(serviceId),
    root: navidromeSearch,
    sources: navidromeSources,
    labels: {
        [Action.AddToLibrary]: t('Add to Navidrome Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Navidrome Favorites'),
    },
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return navidromeSettings.audioLibraries;
    },
    editablePlaylists: navidromePlaylists,
    get host(): string {
        return navidromeSettings.host;
    },
    get libraryId(): string {
        return navidromeSettings.libraryId;
    },
    set libraryId(libraryId: string) {
        navidromeSettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return navidromeSettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        navidromeSettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return navidromeSettings.observeLibraryId();
    },
    addMetadata,
    addToPlaylist,
    canPin,
    canRate,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    getThumbnailUrl,
    lookup,
    rate,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default navidrome;

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canRate<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Media:
            return !item.linearType;

        case ItemType.Artist:
            return true;

        case ItemType.Album:
            return !item.synthetic;

        default:
            return false;
    }
}

function canStore<T extends MediaObject>(item: T): boolean {
    return canRate(item);
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    const playlistId = getIdFromSrc(playlist);
    return navidromeApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', isPublic = false, items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await navidromeApi.createPlaylist(
        name,
        description,
        isPublic,
        items.map(getIdFromSrc)
    );
    return {
        src: `navidrome:playlist:${playlist.id}`,
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
        id: pin.src,
        sourceId: `${serviceId}/pinned-playlist`,
        icon: 'pin',
        isPin: true,
        secondaryItems: navidromePlaylistItems,

        search(): Pager<MediaPlaylist> {
            const id = getIdFromSrc(pin);
            return new NavidromeOffsetPager(
                ItemType.Playlist,
                `playlist/${id}`,
                undefined,
                {
                    childSort: navidromePlaylistItemsSort.defaultSort,
                    childSortId: `${serviceId}/pinned-playlist/2`,
                },
                createPlaylistItemsPager
            );
        },
    } as MediaSource<T>;
}

async function getFilters(filterType: FilterType): Promise<readonly MediaFilter[]> {
    switch (filterType) {
        case FilterType.ByDecade:
            return subsonicApi.getDecades();

        case FilterType.ByGenre:
            return navidromeApi.getGenres();

        default:
            throw Error('Not supported');
    }
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    const itemType = item.itemType;
    if (itemType === ItemType.Media && item.linearType) {
        return item;
    }
    const id = getIdFromSrc(item);
    if (itemType === ItemType.Album) {
        if (item.synthetic) {
            return item;
        }
        if (item.description === undefined) {
            const info = await subsonicApi.getAlbumInfo(id, false);
            item = {
                ...item,
                description: getTextFromHtml(info.notes),
                release_mbid: info.musicBrainzId,
            };
        }
    } else if (itemType === ItemType.Artist && item.description === undefined) {
        const info = await subsonicApi.getArtistInfo(id);
        item = {
            ...item,
            description: getTextFromHtml(info.biography),
            artist_mbid: info.musicBrainzId,
        };
    }
    if ((itemType === ItemType.Media || itemType === ItemType.Album) && !item.shareLink) {
        try {
            const shareLink = await subsonicApi.createShare(id);
            item = {...item, shareLink};
        } catch (err) {
            logger.warn(err);
            logger.info('Could not create share link');
        }
    }
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const type =
        itemType === ItemType.Artist ? 'artist' : itemType === ItemType.Album ? 'album' : 'song';
    const pager = new NavidromeOffsetPager<T>(itemType, `${type}/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    const metadata = await fetchFirstItem<T>(pager, {timeout: 2000});
    return bestOf(item, metadata);
}

function getPlayableUrl(item: PlayableItem): string {
    return subsonicApi.getPlayableUrl(item);
}

async function getPlaybackType(item: PlayableItem): Promise<PlaybackType> {
    return subsonicApi.getPlaybackType(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    return subsonicApi.getServerInfo();
}

function getThumbnailUrl(url: string): string {
    return url.replace('{navidrome-credentials}', navidromeSettings.credentials);
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
    const pager = new NavidromeOffsetPager<MediaItem>(
        ItemType.Media,
        'song',
        {
            title: `${artist} ${title}`,
            _sort: 'artist',
        },
        options
    );
    return fetchFirstPage(pager, {timeout});
}

function scrobble(): void {
    subsonicScrobbler.scrobble(navidrome, subsonicApi);
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    const id = getIdFromSrc(item);
    switch (item.itemType) {
        case ItemType.Album:
        case ItemType.Artist:
        case ItemType.Media:
            await subsonicApi.get('setRating', {id, rating});
    }
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const method = inLibrary ? 'star' : 'unstar';
    const id = getIdFromSrc(item);
    switch (item.itemType) {
        case ItemType.Album:
        case ItemType.Artist:
        case ItemType.Media:
            await subsonicApi.get(method, {id});
    }
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
