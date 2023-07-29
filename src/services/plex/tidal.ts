import {Except, Primitive} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import Pin from 'types/Pin';
import PlayableItem from 'types/PlayableItem';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import StreamingQuality from 'types/StreamingQuality';
import {NoTidalSubscription} from 'services/errors';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {isSourceHidden} from 'services/servicesSettings';
import {bestOf} from 'utils';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './plexAuth';
import plexSettings from './plexSettings';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import PlexPager, {PlexPagerConfig} from './PlexPager';
import plexApi, {getPlexItemType, musicProviderHost, musicSearchHost} from './plexApi';
import plex from './plex';

const serviceId = 'plex-tidal';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration'],
};

const tidalLibraryTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/library-tracks`,
    title: 'My Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createLibraryPager(plexMediaType.Track);
    },
};

const tidalLibraryAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/library-albums`,
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        return createLibraryPager(plexMediaType.Album);
    },
};

const tidalLibraryArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/library-artists`,
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,

    search(): Pager<MediaArtist> {
        return createLibraryPager(plexMediaType.Artist);
    },
};

const tidalLibraryPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/library-playlists`,
    title: 'My Playlists',
    icon: 'heart',
    itemType: ItemType.Playlist,
    lockActionsStore: true,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        checkSubscription();
        return createPager('/playlists/all');
    },
};

// const tidalLibraryVideos: MediaSource<MediaItem> = {
//     id: `${serviceId}/library-videos`,
//     title: 'My Videos',
//     icon: 'heart',
//     itemType: ItemType.Media,
//     mediaType: MediaType.Video,
//     defaultHidden: true,
//     layout: defaultLayout,

//     search(): Pager<MediaItem> {
//         return createLibraryPager(plexMediaType.MusicVideo);
//     },
// };

const tidalMyMixes: MediaSource<MediaPlaylist> = {
    id: 'tidal/my-mixes',
    title: 'Recommended',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        checkSubscription();
        return createPager('/hubs/sections/tidal/myMixes');
    },
};

const tidalPlexPicks: MediaSource<MediaAlbum> = {
    id: 'tidal/plex-picks',
    title: 'Plex Picks',
    icon: 'album',
    itemType: ItemType.Album,
    defaultHidden: true,

    search(): Pager<MediaAlbum> {
        return createPager('/hubs/sections/tidal/plexPicks');
    },
};

const tidalNewPlaylists: MediaSource<MediaPlaylist> = {
    id: 'tidal/new-playlists',
    title: 'New Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return createPager('/hubs/sections/tidal/newPlaylists');
    },
};

const tidal: PublicMediaService = {
    id: serviceId,
    name: 'TIDAL',
    icon: serviceId,
    url: 'https://tidal.com/',
    serviceType: ServiceType.PublicMedia,
    authServiceId: 'plex',
    defaultHidden: isSourceHidden(plex),
    roots: [
        createRoot(ItemType.Media, {title: 'Tracks', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
    ],
    sources: [
        tidalLibraryTracks,
        tidalLibraryAlbums,
        tidalLibraryArtists,
        tidalLibraryPlaylists,
        // tidalLibraryVideos,
        tidalMyMixes,
        tidalNewPlaylists,
        tidalPlexPicks,
    ],
    icons: {
        [Action.AddToLibrary]: 'heart',
        [Action.RemoveFromLibrary]: 'heart-fill',
    },
    labels: {
        [Action.AddToLibrary]: 'Add to My TIDAL',
        [Action.RemoveFromLibrary]: 'Remove from My TIDAL',
    },
    canRate: () => false,
    canStore,
    compareForRating,
    createSourceFromPin,
    getMetadata,
    getPlayableUrl,
    getThumbnailUrl,
    lookup,
    store,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default tidal;

function canStore<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !item.synthetic;

        case ItemType.Artist:
        case ItemType.Media:
            return true;

        default:
            return false;
    }
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        layout: playlistLayout,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            return createPager(`/playlists/${getRatingKey(pin)}`, {
                type: plexMediaType.Playlist,
                playlistType: 'audio',
            });
        },
    };
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    const itemType = item.itemType;
    if (
        itemType === ItemType.Album ||
        itemType === ItemType.Artist ||
        itemType === ItemType.Playlist ||
        (canStore(item) && item.inLibrary === undefined)
    ) {
        const data = await getMetadataByRatingKey<T>(itemType, getRatingKey(item));
        return bestOf(item, data);
    }
    return item;
}

async function getMetadataByRatingKey<T extends MediaObject>(
    itemType: T['itemType'],
    ratingKey: string
): Promise<T> {
    const path =
        itemType === ItemType.Playlist
            ? `/playlists/${ratingKey}`
            : `/library/metadata/${ratingKey}`;
    const pager = createPager<T>(path, undefined, {maxSize: 1});
    const items = await fetchFirstPage<T>(pager, {timeout: 2000});
    return items[0];
}

function getPlayableUrl(item: PlayableItem): string {
    const {userToken} = plexSettings;
    if (userToken) {
        const srcs = item.srcs || [];
        let src: string | undefined = srcs[0];
        switch (plexSettings.streamingQuality) {
            case StreamingQuality.Lossless:
                src = srcs[0];
                break;

            case StreamingQuality.High:
                src = srcs[1];
                break;

            case StreamingQuality.Low:
                src = srcs[2];
                break;
        }
        if (!src) {
            src = srcs[0];
        }
        if (!src) {
            throw Error('No playable source');
        }
        return `${musicProviderHost}${src}?X-Plex-Token=${userToken}`;
    } else {
        throw Error('Not logged in');
    }
}

function getThumbnailUrl(url: string): string {
    return plex.getThumbnailUrl!(url);
}

async function lookup(
    artist: string,
    title: string,
    limit = 10,
    timeout?: number
): Promise<readonly MediaItem[]> {
    if (!plexSettings.hasTidal) {
        return [];
    }
    if (!artist || !title) {
        return [];
    }
    return fetchFirstPage(
        createSearchPager(plexItemType.Track, `${artist} ${title}`, 50, {
            lookup: true,
            maxSize: limit,
        }),
        {timeout}
    );
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    await plexApi.fetch({
        host: musicProviderHost,
        path: `/actions/${inLibrary ? 'save' : 'unsave'}`,
        method: 'PUT',
        params: {
            ratingKey: getRatingKey(item),
        },
    });
}

function createRoot<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `${serviceId}/search/${props.title.toLowerCase()}`,
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            q = q.trim();
            if (q) {
                return createSearchPager(getPlexItemType(itemType), q);
            } else {
                return new SimplePager();
            }
        },
    };
}

function createLibraryPager<T extends MediaObject>(type: plexMediaType): Pager<T> {
    checkSubscription();
    return createPager<T>('/library/sections/saved/all', {type});
}

function createSearchPager<T extends MediaObject>(
    type: plexItemType,
    query: string,
    limit = 100,
    options?: Partial<PlexPagerConfig>
): Pager<T> {
    return new PlexPager<T>(
        {
            host: musicSearchHost,
            path: '/library/search',
            params: {query, limit, type, searchTypes: 'music'},
        },
        {...options, serviceId}
    );
}

function createPager<T extends MediaObject>(
    path: string,
    params?: Record<string, Primitive>,
    options?: Partial<PlexPagerConfig>
): Pager<T> {
    const host = musicProviderHost;
    return new PlexPager<T>({host, path, params}, {...options, serviceId});
}

function getRatingKey({src}: {src: string}): string {
    const [, , ratingKey] = src.split(':');
    return ratingKey;
}

function checkSubscription(): void {
    if (!plexSettings.hasTidal) {
        throw new NoTidalSubscription();
    }
}
