import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import ViewType from 'types/ViewType';
import ratingStore from 'services/actions/ratingStore';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';
import ListenBrainzLikesPager from './ListenBrainzLikesPager';
import listenbrainzSettings from './listenbrainzSettings';
import ListenBrainzStatsPager from './ListenBrainzStatsPager';

console.log('module::listenbrainz');

export const listenbrainzHistory: MediaSource<MediaItem> = {
    id: 'listenbrainz/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    defaultHidden: true,

    search({startAt: max_ts = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new ListenBrainzHistoryPager(max_ts ? {max_ts} : undefined);
    },
};

export const listenbrainzRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'listenbrainz/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new ListenBrainzHistoryPager();
    },
};

const listenbrainzLovedTracks: MediaSource<MediaItem> = {
    id: 'listenbrainz/loved-tracks',
    title: 'Loved Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    viewType: ViewType.Ratings,
    defaultHidden: true,
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
    layout: {
        view: 'card minimal',
        fields: ['Thumbnail', 'Title', 'PlayCount'],
    },
    defaultHidden: true,

    search(params: {range: string}): Pager<MediaArtist> {
        return new ListenBrainzStatsPager(
            `stats/user/${listenbrainzSettings.userId}/artists`,
            params
        );
    },
};

const listenbrainz: MediaService = {
    id: 'listenbrainz',
    name: 'ListenBrainz',
    icon: 'listenbrainz',
    url: 'https://listenbrainz.org',
    isScrobbler: true,
    roots: [listenbrainzRecentlyPlayed],
    sources: [
        listenbrainzTopTracks,
        listenbrainzTopAlbums,
        listenbrainzTopArtists,
        listenbrainzHistory,
        listenbrainzLovedTracks,
    ],
    labels: {
        [Action.Like]: 'Love on ListenBrainz',
        [Action.Unlike]: 'Unlove on ListenBrainz',
    },
    canRate,
    canStore: () => false,
    compareForRating,
    rate,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default listenbrainz;

ratingStore.addObserver(listenbrainz, 5);

function canRate<T extends MediaObject>(item: T): boolean {
    return item.itemType === ItemType.Media && !!(item.recording_mbid || item.recording_msid);
}

export function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    switch (a.itemType) {
        case ItemType.Media:
            return (
                a.itemType === b.itemType &&
                ((!!a.recording_mbid && a.recording_mbid === b.recording_mbid) ||
                    (!!a.recording_msid && a.recording_msid === b.recording_msid))
            );

        default:
            return false;
    }
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    if (canRate(item)) {
        await listenbrainzApi.rate(item as MediaItem, rating);
    }
}
