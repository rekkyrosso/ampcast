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
import NavidromePager from './NavidromePager';
import navidromeSettings from './navidromeSettings';
import navidromeSources, {navidromePlaylists, navidromeSearch} from './navidromeSources';
import navidromeApi from './navidromeApi';
import subsonicApi from './subsonicApi';
import ServerSettings from './components/NavidromeServerSettings';

const serviceId: MediaServiceId = 'navidrome';

const logger = new Logger(serviceId);

const navidrome: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Navidrome',
    url: 'https://www.navidrome.org',
    serviceType: ServiceType.PersonalMedia,
    Components: {ServerSettings},
    defaultHidden: !isStartupService(serviceId),
    root: navidromeSearch,
    sources: navidromeSources,
    labels: {
        [Action.AddToLibrary]: t('Add to Navidrome Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Navidrome Favorites'),
    },
    editablePlaylists: navidromePlaylists,
    get host(): string {
        return navidromeSettings.host;
    },
    addMetadata,
    addToPlaylist,
    canPin,
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

function canStore<T extends MediaObject>(item: T): boolean {
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
        icon: 'pin',
        isPin: true,

        search(): Pager<T> {
            const id = getIdFromSrc(pin);
            return new NavidromePager(ItemType.Playlist, `playlist/${id}`);
        },
    };
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
    const pager = new NavidromePager<T>(itemType, `${type}/${id}`, undefined, {
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
    const pager = new NavidromePager<MediaItem>(
        ItemType.Media,
        'song',
        {
            title: `${artist} ${title}`,
            _sort: 'order_artist_name,order_album_name,track_number',
        },
        options
    );
    return fetchFirstPage(pager, {timeout});
}

function scrobble(): void {
    subsonicScrobbler.scrobble(navidrome, subsonicApi);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const id = getIdFromSrc(item);
    const method = inLibrary ? 'star' : 'unstar';
    switch (item.itemType) {
        case ItemType.Media:
            await subsonicApi.get(method, {id});
            break;

        case ItemType.Album:
            await subsonicApi.get(method, {albumId: id});
            break;

        case ItemType.Artist:
            await subsonicApi.get(method, {artistId: id});
            break;
    }
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
