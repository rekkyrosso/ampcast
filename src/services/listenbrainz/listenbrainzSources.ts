import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import Pager from 'types/Pager';
import {uniq} from 'utils';
import SimplePager from 'services/pagers/SimplePager';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';
import ListenBrainzLikesPager from './ListenBrainzLikesPager';
import ListenBrainzNewAlbumsPager from './ListenBrainzNewAlbumsPager';
import ListenBrainzPlaylistsPager from './ListenBrainzPlaylistsPager';
import ListenBrainzStatsPager from './ListenBrainzStatsPager';
import listenbrainzSettings from './listenbrainzSettings';
import ListenBrainzHistoryBrowser from './components/ListenBrainzHistoryBrowser';
import ListenBrainzScrobblesBrowser from './components/ListenBrainzScrobblesBrowser';
import {albumsLayout, getDefaultLayout} from 'components/MediaList/layouts';

const serviceId: MediaServiceId = 'listenbrainz';

const listenbrainzHistory: MediaSource<MediaItem> = {
    id: `${serviceId}/history`,
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    Component: ListenBrainzHistoryBrowser,

    search({startAt: max_ts = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new ListenBrainzHistoryPager('listens', max_ts ? {max_ts} : undefined);
    },
};

export const listenbrainzScrobbles: MediaSource<MediaItem> = {
    id: `${serviceId}/scrobbles`,
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
    id: `${serviceId}/loved-tracks`,
    title: 'Loved Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,

    search(): Pager<MediaItem> {
        return new ListenBrainzLikesPager();
    },
};

export const listenbrainzPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    defaultHidden: true,

    search(): Pager<MediaPlaylist> {
        return new ListenBrainzPlaylistsPager(`user/${listenbrainzSettings.userId}/playlists`);
    },
};

const listenbrainzRecommendations: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/recommendations`,
    title: 'Recommendations',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    defaultHidden: true,

    search(): Pager<MediaPlaylist> {
        return new ListenBrainzPlaylistsPager(
            `user/${listenbrainzSettings.userId}/playlists/createdfor`
        );
    },
};

const listenbrainzNewReleases: MediaSource<MediaAlbum> = {
    id: `${serviceId}/new-albums`,
    title: 'New Releases',
    icon: 'album',
    itemType: ItemType.Album,
    defaultHidden: true,
    primaryItems: {
        layout: {
            ...albumsLayout,
            card: {
                ...albumsLayout.card,
                data: 'Released',
            },
            details: albumsLayout.details.concat('Released'),
        },
    },

    search(): Pager<MediaAlbum> {
        return new ListenBrainzNewAlbumsPager();
    },
};

type TopItems<T extends MediaObject> = Pick<
    MediaSource<T>,
    'primaryItems' | 'secondaryItems' | 'tertiaryItems'
>;

const listenbrainzTopArtistsLayout: Partial<MediaListLayout> = {
    view: 'card minimal',
    card: {
        h1: 'Title',
        data: 'PlayCount',
    },
    views: [],
};

const listenbrainzTopArtists: TopItems<MediaArtist> = {
    primaryItems: {
        layout: listenbrainzTopArtistsLayout,
    },
    secondaryItems: {
        layout: {view: 'none'},
    },
};

const listenbrainzChartTopArtists: TopItems<MediaArtist> = {
    primaryItems: {
        layout: {
            ...listenbrainzTopArtistsLayout,
            card: {
                index: 'Index',
                h1: 'Title',
                data: 'PlayCount',
            },
        },
    },
    secondaryItems: {
        layout: {view: 'none'},
    },
};

const listenbrainzSources = [
    createTopMultiSource<MediaItem>(ItemType.Media, 'Top Tracks', 'recordings'),
    createTopMultiSource<MediaAlbum>(ItemType.Album, 'Top Albums', 'releases'),
    createTopMultiSource<MediaArtist>(
        ItemType.Artist,
        'Top Artists',
        'artists',
        listenbrainzTopArtists
    ),
    listenbrainzLovedTracks,
    listenbrainzHistory,
    listenbrainzPlaylists,
    createTopMultiSource<MediaItem>(ItemType.Media, 'Singles Charts', 'sitewide/recordings'),
    createTopMultiSource<MediaAlbum>(ItemType.Album, 'Album Charts', 'sitewide/releases'),
    createTopMultiSource<MediaArtist>(
        ItemType.Artist,
        'Artist Charts',
        'sitewide/artists',
        listenbrainzChartTopArtists
    ),
    listenbrainzRecommendations,
    listenbrainzNewReleases,
];

export default listenbrainzSources;

function createTopMultiSource<T extends MediaObject>(
    itemType: T['itemType'],
    title: string,
    path: string,
    items?: TopItems<T>
): MediaMultiSource<T> {
    const isChart = path.startsWith('sitewide/');
    const icon = isChart ? 'chart' : 'star';
    if (!items?.primaryItems) {
        if (!items) {
            items = {};
        }
        let layout = addPlayCount(getDefaultLayout(itemType));
        if (isChart) {
            layout = addIndex(layout);
        }
        (items as any).primaryItems = {layout};
    }
    const sourceProps: Except<MediaSource<T>, 'id' | 'search' | 'title'> = {
        icon,
        itemType,
        ...items,
    };
    return {
        id: `${serviceId}/top/${path}`,
        title,
        icon,
        searchable: false,
        defaultHidden: isChart,
        sources: [
            createTopSource<T>(path, 'week', {
                title: 'Week',
                ...sourceProps,
            }),
            createTopSource<T>(path, 'month', {
                title: 'Month',
                ...sourceProps,
            }),
            createTopSource<T>(path, 'year', {
                title: 'Year',
                ...sourceProps,
            }),
            createTopSource<T>(path, 'all_time', {
                title: 'All time',
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
    const isChart = path.startsWith('sitewide/');
    const sourceId = `${serviceId}/top/${path}`;
    return {
        ...props,
        sourceId,
        id: `${sourceId}/${range}`,

        search(): Pager<T> {
            return new ListenBrainzStatsPager(
                isChart ? `stats/${path}` : `stats/user/${listenbrainzSettings.userId}/${path}`,
                {range},
                {maxSize: 1000}
            );
        },
    };
}

function addIndex(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        card: {...layout.card, index: 'Index'},
        details: uniq(['Index', ...layout.details]),
    };
}

function addPlayCount(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        card: {...layout.card, data: 'PlayCount'},
        details: uniq([...layout.details, 'PlayCount']),
    };
}
