import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
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
import ServiceType from 'types/ServiceType';
import DataService from 'types/DataService';
import SimplePager from 'services/pagers/SimplePager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';
import ListenBrainzLikesPager from './ListenBrainzLikesPager';
import ListenBrainzPlaylistsPager from './ListenBrainzPlaylistsPager';
import ListenBrainzPlaylistItemsPager from './ListenBrainzPlaylistItemsPager';
import ListenBrainzStatsPager from './ListenBrainzStatsPager';
import listenbrainzSettings from './listenbrainzSettings';
import {scrobble} from './listenbrainzScrobbler';
import ListenBrainzHistoryBrowser from './components/ListenBrainzHistoryBrowser';
import ListenBrainzScrobblesBrowser from './components/ListenBrainzScrobblesBrowser';
import ListenBrainzTopBrowser from './components/ListenBrainzTopBrowser';

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title'],
};

export const listenbrainzHistory: MediaSource<MediaItem> = {
    id: 'listenbrainz/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    component: ListenBrainzHistoryBrowser,

    search({startAt: max_ts = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new ListenBrainzHistoryPager(max_ts ? {max_ts} : undefined);
    },
};

export const listenbrainzScrobbles: MediaSource<MediaItem> = {
    id: 'listenbrainz/scrobbles',
    title: 'Scrobbles',
    icon: 'clock',
    itemType: ItemType.Media,
    component: ListenBrainzScrobblesBrowser,

    search(): Pager<MediaItem> {
        // This doesn't get called (intercepted by `ListenBrainzScrobblesBrowser`).
        return new SimplePager();
    },
};

const listenbrainzLovedTracks: MediaSource<MediaItem> = {
    id: 'listenbrainz/loved-tracks',
    title: 'Loved Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear'],
    },

    search(): Pager<MediaItem> {
        return new ListenBrainzLikesPager();
    },
};

const listenbrainzTopTracks: MediaSource<MediaItem> = {
    id: 'listenbrainz/top/tracks',
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    component: ListenBrainzTopBrowser,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Artist', 'PlayCount'],
    },

    search(params: {range: string}): Pager<MediaItem> {
        return new ListenBrainzStatsPager(
            `stats/user/${listenbrainzSettings.userId}/recordings`,
            params
        );
    },
};

const listenbrainzTopAlbums: MediaSource<MediaAlbum> = {
    id: 'listenbrainz/top/albums',
    title: 'Top Albums',
    icon: 'star',
    itemType: ItemType.Album,
    component: ListenBrainzTopBrowser,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'PlayCount'],
    },

    search(params: {range: string}): Pager<MediaAlbum> {
        return new ListenBrainzStatsPager(
            `stats/user/${listenbrainzSettings.userId}/releases`,
            params
        );
    },
};

const listenbrainzTopArtists: MediaSource<MediaArtist> = {
    id: 'listenbrainz/top/artists',
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    component: ListenBrainzTopBrowser,
    layout: {
        view: 'card minimal',
        fields: ['Thumbnail', 'Title', 'PlayCount'],
    },
    secondaryLayout: {view: 'none'},

    search(params: {range: string}): Pager<MediaArtist> {
        return new ListenBrainzStatsPager(
            `stats/user/${listenbrainzSettings.userId}/artists`,
            params
        );
    },
};

const listenbrainzPlaylists: MediaSource<MediaPlaylist> = {
    id: 'listenbrainz/playlists',
    title: 'My Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,
    defaultHidden: true,

    search(): Pager<MediaPlaylist> {
        return new ListenBrainzPlaylistsPager(`user/${listenbrainzSettings.userId}/playlists`);
    },
};

const listenbrainzRecommendations: MediaSource<MediaPlaylist> = {
    id: 'listenbrainz/recommendations',
    title: 'Recommendations',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,
    defaultHidden: true,

    search(): Pager<MediaPlaylist> {
        return new ListenBrainzPlaylistsPager(
            `user/${listenbrainzSettings.userId}/playlists/createdfor`
        );
    },
};

const listenbrainz: DataService = {
    id: 'listenbrainz',
    name: 'ListenBrainz',
    icon: 'listenbrainz',
    url: 'https://listenbrainz.org',
    serviceType: ServiceType.DataService,
    canScrobble: true,
    defaultHidden: true,
    internetRequired: true,
    root: listenbrainzScrobbles,
    sources: [
        listenbrainzTopTracks,
        listenbrainzTopAlbums,
        listenbrainzTopArtists,
        listenbrainzLovedTracks,
        listenbrainzHistory,
        listenbrainzPlaylists,
        listenbrainzRecommendations,
    ],
    labels: {
        [Action.AddToLibrary]: 'Love on ListenBrainz',
        [Action.RemoveFromLibrary]: 'Unlove on ListenBrainz',
    },
    editablePlaylists: listenbrainzPlaylists,
    addToPlaylist,
    canRate: () => false,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default listenbrainz;

function canStore<T extends MediaObject>(item: T): boolean {
    return item.itemType === ItemType.Media && !!(item.recording_mbid || item.recording_msid);
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return listenbrainzApi.compareForRating(a, b);
}

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    return listenbrainzApi.addToPlaylist(playlist, items);
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    options: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const {playlist_mbid} = await listenbrainzApi.createPlaylist(name, options);
    return {
        src: `listenbrainz:playlist:${playlist_mbid}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const [, , playlist_mbid] = pin.src.split(':');
            const pager = new ListenBrainzPlaylistItemsPager(playlist_mbid);
            const playlist = {...pin, pager};
            return new SimpleMediaPager(async () => [playlist]);
        },
    };
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    if (canStore(item)) {
        await listenbrainzApi.store(item as MediaItem, inLibrary);
    }
}
