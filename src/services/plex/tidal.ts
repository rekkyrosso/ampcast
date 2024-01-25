import type {Observable} from 'rxjs';
import {combineLatest, distinctUntilChanged, map} from 'rxjs';
import {Except, Primitive, Writable} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import DRMInfo from 'types/DRMInfo';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import Pin from 'types/Pin';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import StreamingQuality from 'types/StreamingQuality';
import actionsStore from 'services/actions/actionsStore';
import {NoTidalSubscriptionError} from 'services/errors';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {isSourceVisible, observeSourceVisibility} from 'services/servicesSettings';
import {drmKeySystems} from 'utils';
import {login, logout} from './plexAuth';
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

    search(): Pager<MediaPlaylist> {
        checkSubscription();
        return createPager('/playlists/all', {sort: 'addedAt:desc'});
    },
};

const tidalEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/editable-playlists`,
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return createPager('/playlists/all', {readOnly: '0', smart: '0'});
    },
};

const tidalLibraryVideos: MediaSource<MediaItem> = {
    id: `${serviceId}/library-videos`,
    title: 'My Videos',
    icon: 'heart',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    defaultHidden: true,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createLibraryPager(plexMediaType.MusicVideo);
    },
};

const tidalMyMixes: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/my-mixes`,
    title: 'Recommended',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,

    search(): Pager<MediaPlaylist> {
        checkSubscription();
        return createPager('/hubs/sections/tidal/myMixes');
    },
};

const tidalPlexPicks: MediaSource<MediaAlbum> = {
    id: `${serviceId}/plex-picks`,
    title: 'Plex Picks',
    icon: 'album',
    itemType: ItemType.Album,
    defaultHidden: true,

    search(): Pager<MediaAlbum> {
        return createPager('/hubs/sections/tidal/plexPicks');
    },
};

const tidalNewPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/new-playlists`,
    title: 'New Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    layout: playlistLayout,

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
    primaryMediaType: MediaType.Audio,
    authService: plex,
    internetRequired: true,
    defaultHidden: true,
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
        tidalLibraryVideos,
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
    editablePlaylists: tidalEditablePlaylists,
    addToPlaylist,
    canRate: () => false,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getDrmInfo,
    getMetadata,
    getPlayableUrl,
    getPlaybackType,
    getThumbnailUrl,
    lookup,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default tidal;

function observeIsLoggedIn(): Observable<boolean> {
    return combineLatest([plex.observeIsLoggedIn(), observeSourceVisibility(tidal)]).pipe(
        map(([isLoggedIn, visible]) => isLoggedIn && visible),
        distinctUntilChanged()
    );
}

function isConnected(): boolean {
    return plex.isConnected() && isSourceVisible(tidal);
}

function isLoggedIn(): boolean {
    return plex.isLoggedIn() && isSourceVisible(tidal);
}

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

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    return plexApi.addToPlaylist(playlist, items, musicProviderHost);
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await plexApi.createPlaylist(name, description, items, musicProviderHost);
    return {
        src: `plex-tidal:playlist:${playlist.ratingKey}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        layout: {
            view: 'card',
            fields: ['Thumbnail', 'IconTitle', 'TrackCount', 'Blurb'],
        },
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

function getDrmInfo(item?: PlayableItem): DRMInfo | undefined {
    if (item?.playbackType === PlaybackType.DASH) {
        const type = plexSettings.drm;
        const isFairplay = type === 'fairplay';
        const keySystem = isFairplay ? ('com.apple.fps.1_0' as any) : drmKeySystems[type];
        const license = getPlayableUrl(item).replace(/\.(mpd|m3u8)/, '/license');
        const info: DRMInfo = {type, keySystem, license};
        if (isFairplay) {
            (info as Writable<DRMInfo>).certificate =
                'https://resources.tidal.com/drm/fairplay/certificate';
        }
        return info;
    }
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const ratingKey = getRatingKey(item);
    const [plexItem] = await plexApi.getMetadata<plex.RatingObject>([ratingKey], musicProviderHost);
    return {...item, inLibrary: plexItem.saved};
}

function getPlayableUrl(item: PlayableItem): string {
    const {userToken} = plexSettings;
    if (userToken && isLoggedIn()) {
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
        const headers = plexApi.getHeaders(userToken, plexSettings.drm);
        const params = new URLSearchParams(headers);
        return `${musicProviderHost}${src}?${params}`;
    } else {
        throw Error('Not logged in');
    }
}

async function getPlaybackType(item: MediaItem): Promise<PlaybackType> {
    return item.mediaType === MediaType.Video ? PlaybackType.HLS : PlaybackType.DASH;
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
    if (!plexSettings.hasTidal || !artist || !title) {
        return [];
    }
    artist = artist.replace(/\s*([,;&|/x×]|(\b(feat\.?|ft\.?|featuring|with)\s))\s*/gi, ' ').trim(); // joiners
    const search = async (query: string) =>
        fetchFirstPage<MediaItem>(
            createSearchPager(plexItemType.Track, query, limit, {
                pageSize: limit,
                maxSize: limit,
                lookup: true,
            }),
            {timeout}
        );

    let items = await search(`${artist} ${title}`);
    if (items.length === 0) {
        items = await search(title);
    }
    return items;
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
        throw new NoTidalSubscriptionError();
    }
}
