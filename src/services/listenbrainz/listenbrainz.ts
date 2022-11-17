import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import {observeIsLoggedIn, login, logout} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';
import listenbrainzSettings from './listenbrainzSettings';
import ListenBrainzStatsPager from './ListenBrainzStatsPager';
import './listenbrainzScrobbler';

console.log('module::listenbrainz');

export const listenbrainzHistory: MediaSource<MediaItem> = {
    id: 'listenbrainz/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,

    search({startAt: max_ts = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        console.log('search/listenbrainz/history', {max_ts});
        return new ListenBrainzHistoryPager(max_ts ? {max_ts} : undefined);
    },
};

const topTracks: MediaSource<MediaItem> = {
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

const topAlbums: MediaSource<MediaAlbum> = {
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

const topArtists: MediaSource<MediaArtist> = {
    id: 'listenbrainz/top/artists',
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    layout: {
        view: 'card minimal',
        fields: ['Thumbnail', 'Title', 'PlayCount'],
    },

    search(params: {range: string}): Pager<MediaArtist> {
        return new ListenBrainzStatsPager(
            `stats/user/${listenbrainzSettings.userId}/artists`,
            params
        );
    },
};

const listenbrainz: MediaService = {
    id: 'listenbrainz',
    title: 'ListenBrainz',
    icon: 'listenbrainz',
    url: 'https://listenbrainz.org/',
    scrobbler: true,
    sources: [topTracks, topAlbums, topArtists],
    searches: [listenbrainzHistory],

    observeIsLoggedIn,
    login,
    logout,
};

export default listenbrainz;
