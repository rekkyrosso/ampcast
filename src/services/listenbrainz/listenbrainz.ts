import {Except} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import Pin from 'types/Pin';
import ServiceType from 'types/ServiceType';
import DataService from 'types/DataService';
import SimplePager from 'services/pagers/SimplePager';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';
import ListenBrainzLikesPager from './ListenBrainzLikesPager';
import ListenBrainzPlaylistsPager from './ListenBrainzPlaylistsPager';
import ListenBrainzStatsPager from './ListenBrainzStatsPager';
import listenbrainzSettings from './listenbrainzSettings';
import {scrobble} from './listenbrainzScrobbler';
import ListenBrainzHistoryBrowser from './components/ListenBrainzHistoryBrowser';
import ListenBrainzScrobblesBrowser from './components/ListenBrainzScrobblesBrowser';

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title'],
};

export const listenbrainzHistory: MediaSource<MediaItem> = {
    id: 'listenbrainz/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    Component: ListenBrainzHistoryBrowser,

    search({startAt: max_ts = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new ListenBrainzHistoryPager(max_ts ? {max_ts} : undefined);
    },
};

export const listenbrainzScrobbles: MediaSource<MediaItem> = {
    id: 'listenbrainz/scrobbles',
    title: 'Scrobbles',
    icon: 'clock',
    itemType: ItemType.Media,
    Component: ListenBrainzScrobblesBrowser,

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
        createTopMultiSource<MediaItem>(ItemType.Media, 'Top Tracks', 'recordings', {
            layout: {
                view: 'card compact',
                fields: ['Thumbnail', 'Title', 'Artist', 'PlayCount'],
            },
        }),
        createTopMultiSource<MediaAlbum>(ItemType.Album, 'Top Albums', 'releases', {
            layout: {
                view: 'card compact',
                fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'PlayCount'],
            },
        }),
        createTopMultiSource<MediaArtist>(ItemType.Artist, 'Top Artists', 'artists', {
            layout: {
                view: 'card minimal',
                fields: ['Thumbnail', 'Title', 'PlayCount'],
            },
            secondaryLayout: {view: 'none'},
        }),
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
        trackCount: 0,
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
            return new ListenBrainzPlaylistsPager(`playlist/${playlist_mbid}`, true);
        },
    };
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    if (canStore(item)) {
        await listenbrainzApi.store(item as MediaItem, inLibrary);
    }
}

function createTopMultiSource<T extends MediaObject>(
    itemType: T['itemType'],
    title: string,
    path: string,
    layouts: Pick<MediaSource<T>, 'layout' | 'secondaryLayout' | 'tertiaryLayout'>
): MediaMultiSource<T> {
    const icon = 'star';
    const sourceProps: Except<MediaSource<T>, 'id' | 'search' | 'title'> = {
        icon,
        itemType,
        ...layouts,
    };
    return {
        id: `listenbrainz/top/${path}`,
        title,
        icon,
        searchable: false,
        sources: [
            createTopSource<T>(path, 'all_time', {
                title: 'All time',
                ...sourceProps,
            }),
            createTopSource<T>(path, 'this_year', {
                title: 'Year',
                ...sourceProps,
            }),
            createTopSource<T>(path, 'this_month', {
                title: 'Month',
                ...sourceProps,
            }),
            createTopSource<T>(path, 'this_week', {
                title: 'Week',
                ...sourceProps,
            }),
        ],
    } as unknown as MediaMultiSource<T>; // ಠ_ಠ
}

function createTopSource<T extends MediaObject>(
    path: string,
    range:
        | 'week'
        | 'month'
        | 'quarter'
        | 'half_yearly'
        | 'year'
        | 'all_time'
        | 'this_week'
        | 'this_month'
        | 'this_year',
    props: Except<MediaSource<T>, 'id' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: `listenbrainz/top/${path}/${range}`,

        search(): Pager<T> {
            return new ListenBrainzStatsPager(`stats/user/${listenbrainzSettings.userId}/${path}`, {
                range,
            });
        },
    };
}
