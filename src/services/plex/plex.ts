import type {Observable} from 'rxjs';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import Lyrics from 'types/Lyrics';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import PlaybackType from 'types/PlaybackType';
import ServiceType from 'types/ServiceType';
import {getMediaObjectId, Logger} from 'utils';
import actionsStore from 'services/actions/actionsStore';
import mediaSources from 'services/mediaServices/mediaSources';
import fetchFirstPage, {fetchFirstItem} from 'services/pagers/fetchFirstPage';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './plexAuth';
import plexApi from './plexApi';
import PlexPager from './PlexPager';
import PlexRadioPager from './PlexRadioPager';
import {scrobble} from './plexScrobbler';
import plexSettings from './plexSettings';
import plexSources, {
    createSearchPager,
    createSourceFromObject,
    createSourceFromPin,
    plexEditablePlaylists,
    plexSearch,
} from './plexSources';
import ServerSettings from './components/PlexServerSettings';

const serviceId: MediaServiceId = 'plex';

const logger = new Logger(serviceId);

const plex: PersonalMediaService = {
    id: serviceId,
    name: 'Plex',
    icon: serviceId,
    url: 'https://www.plex.tv',
    serviceType: ServiceType.PersonalMedia,
    Components: {ServerSettings},
    get internetRequired() {
        return plexSettings.internetRequired;
    },
    root: plexSearch,
    sources: plexSources,
    editablePlaylists: plexEditablePlaylists,
    starRatingIncrement: 0.5,
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
    createRadioPager,
    createSongRadio,
    createSourceFromObject,
    createSourceFromPin,
    editPlaylist,
    getFilters,
    getLyrics,
    getMediaObject,
    getPlayableUrl,
    getPlaybackType,
    getServerInfo,
    getThumbnailUrl,
    lookup,
    rate,
    scrobble,
    observeConnecting,
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

function canRate<T extends MediaObject>(item: T): boolean {
    if (item.synthetic) {
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
        src: `${serviceId}:playlist:${playlist.ratingKey}`,
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
    const [, type, ratingKey] = item.src.split(':');
    return type === 'song-radio'
        ? new SimpleMediaPager(async () => {
              const item = await getMediaObject<MediaItem>(`plex:track:${ratingKey}`);
              const pager = new PlexPager<MediaItem>({
                  path: `/library/metadata/${ratingKey}/similar`,
              });
              try {
                  const items = await fetchFirstPage(pager);
                  return [item, ...items];
              } catch (err) {
                  logger.info('createRadioPager');
                  logger.error(err);
                  return [item];
              }
          })
        : new PlexRadioPager(item.src);
}

function createSongRadio(song: MediaItem): MediaItem | null {
    if (plexSettings.sonicAnalysis) {
        const id = getMediaObjectId(song);
        return mediaSources.createRadioItem({
            src: `${serviceId}:song-radio:${id}`,
            title: `${song.title} - Radio`,
            thumbnails: song.thumbnails,
        });
    } else {
        return null;
    }
}

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    await plexApi.editPlaylist(playlist);
    return playlist;
}

async function getFilters(
    filterType: FilterType,
    itemType: ItemType
): Promise<readonly MediaFilter[]> {
    return plexApi.getFilters(filterType, itemType);
}

async function getLyrics(item: MediaItem): Promise<Lyrics | null> {
    const ratingKey = getMediaObjectId(item);
    const [track] = await plexApi.getMetadata<plex.Track>([ratingKey]);
    const lyricsStream = track.Media?.[0]?.Part?.[0]?.Stream?.find(
        (stream) => stream.streamType === 4
    );
    if (lyricsStream) {
        const key = (lyricsStream as any).key; // TODO: Improve types.
        const lyrics = plexApi.getLyrics(key);
        return lyrics;
    }
    return null;
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const rating = actionsStore.getRating(item);
    if (rating !== undefined) {
        return {...item, rating};
    }
    const ratingKey = getMediaObjectId(item);
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

function getPlayableUrl(item: MediaItem): string {
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
    return url.replace('{plex-token}', plexSettings.accessToken);
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
        createSearchPager<MediaItem>(ItemType.Media, `${artist} ${title}`, undefined, {
            pageSize: limit,
            maxSize: limit,
            passive: true,
        }),
        {timeout}
    );
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    await plexApi.fetch({
        path: '/:/rate',
        method: 'PUT',
        params: {
            key: getMediaObjectId(item),
            identifier: 'com.plexapp.plugins.library',
            rating: rating * 2 || -1,
        },
    });
}
