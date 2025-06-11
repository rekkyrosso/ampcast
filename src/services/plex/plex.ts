import type {Observable} from 'rxjs';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import Pin from 'types/Pin';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {isStartupService} from 'services/buildConfig';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './plexAuth';
import plexApi from './plexApi';
import plexMediaType from './plexMediaType';
import PlexPager from './PlexPager';
import {scrobble} from './plexScrobbler';
import plexSettings from './plexSettings';
import {getRatingKey} from './plexUtils';
import plexSources, {createSearchPager, plexEditablePlaylists, plexSearch} from './plexSources';
import Login from './components/PlexLogin';
import ServerSettings from './components/PlexServerSettings';
import './bootstrap';

const plex: PersonalMediaService = {
    id: 'plex',
    name: 'Plex',
    icon: 'plex',
    url: 'https://www.plex.tv',
    serviceType: ServiceType.PersonalMedia,
    defaultHidden: !isStartupService('plex'),
    Components: {Login, ServerSettings},
    get internetRequired() {
        return plexSettings.internetRequired;
    },
    root: plexSearch,
    sources: plexSources,
    editablePlaylists: plexEditablePlaylists,
    get audioLibraries(): readonly PersonalMediaLibrary[] {
        return plexSettings.audioLibraries;
    },
    get host(): string {
        return plexSettings.host;
    },
    get libraryId(): string {
        return plexSettings.libraryId;
    },
    set libraryId(libraryId: string) {
        plexSettings.libraryId = libraryId;
    },
    get libraries(): readonly PersonalMediaLibrary[] {
        return plexSettings.libraries;
    },
    set libraries(libraries: readonly PersonalMediaLibrary[]) {
        plexSettings.libraries = libraries;
    },
    observeLibraryId(): Observable<string> {
        return plexSettings.observeLibraryId();
    },
    addMetadata,
    addToPlaylist,
    canPin,
    canRate,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMediaObject,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    getThumbnailUrl,
    lookup,
    rate,
    scrobble,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default plex;

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canRate<T extends MediaObject>(item: T, inListView?: boolean): boolean {
    if (inListView || !item.src.startsWith('plex:') || item.synthetic) {
        return false;
    }
    switch (item.itemType) {
        case ItemType.Album:
        case ItemType.Artist:
            return true;

        case ItemType.Media:
            return item.mediaType === MediaType.Audio && item.linearType !== LinearType.Station;

        default:
            return false;
    }
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    return plexApi.addToPlaylist(playlist, items);
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await plexApi.createPlaylist(name, description, items);
    return {
        src: `plex:playlist:${playlist.ratingKey}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items.length,
    };
}

function createSourceFromPin<T extends MediaObject>(pin: Pin): MediaSource<T> {
    if (pin.itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    return {
        title: pin.title,
        itemType: pin.itemType,
        id: pin.src,
        icon: 'pin',
        isPin: true,
        layout: {
            view: 'card',
            fields: ['Thumbnail', 'PinTitle', 'TrackCount', 'Description', 'Progress'],
        },
        search(): Pager<T> {
            return new PlexPager({
                path: `/playlists/${getRatingKey(pin)}`,
                params: {
                    type: plexMediaType.Playlist,
                    playlistType: 'audio',
                },
            });
        },
    };
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return plexApi.getFilters(filterType, itemType);
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const rating = actionsStore.getRating(item);
    if (rating !== undefined) {
        return {...item, rating};
    }
    const ratingKey = getRatingKey(item);
    const [plexItem] = await plexApi.getMetadata<plex.RatingObject>([ratingKey]);
    return {...item, rating: Math.round((plexItem.userRating || 0) / 2)};
}

async function getMediaObject<T extends MediaObject>(src: string): Promise<T> {
    const [, , ratingKey] = src.split(':');
    const pager = new PlexPager<T>(
        {path: `/library/metadata/${ratingKey}`},
        {pageSize: 1, maxSize: 1}
    );
    return fetchFirstItem<T>(pager, {timeout: 2000});
}

function getPlayableUrl(item: PlayableItem): string {
    return plexApi.getPlayableUrl(item);
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return plexApi.getPlaybackType(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    let server = plexSettings.server;
    if (server) {
        const servers = await plexApi.getServers();
        server = servers.find((s) => s.id === server!.id) || server;
        return {
            'Server type': server.product || '',
            'Server version': server.productVersion?.replace(/-.*$/, '') || '',
        };
    } else {
        return {};
    }
}

function getThumbnailUrl(url: string): string {
    return url.replace('{plex-token}', plexSettings.serverToken);
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
    return fetchFirstPage(
        createSearchPager<MediaItem>(ItemType.Media, `${artist} ${title}`, {
            pageSize: limit,
            maxSize: limit,
            lookup: true,
        }),
        {timeout}
    );
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    await plexApi.fetch({
        path: '/:/rate',
        method: 'PUT',
        params: {
            key: getRatingKey(item),
            identifier: 'com.plexapp.plugins.library',
            rating: rating * 2 || -1,
        },
    });
}
