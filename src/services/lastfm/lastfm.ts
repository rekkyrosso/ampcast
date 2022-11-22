import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import {observeIsLoggedIn, login, logout} from './lastfmAuth';
import LastFmPager from './LastFmPager';
import LastFmHistoryPager from './LastFmHistoryPager';
import lastfmSettings from './lastfmSettings';
import './lastfmScrobbler';

console.log('module::lastfm');

const topTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'PlayCount'],
};

const albumLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'PlayCount'],
};

const albumTrackLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Title', 'Artist'],
};

const artistLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card minimal',
    fields: ['Thumbnail', 'Title', 'PlayCount'],
};

export const lastfmHistory: MediaSource<MediaItem> = {
    id: 'lastfm/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,

    search({startAt: to = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        console.log('search/lastfm/history', {to});
        return new LastFmHistoryPager(to ? {to} : undefined);
    },
};

const lastfmRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'lastfm/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new LastFmHistoryPager();
    },
};

const lastfm: MediaService = {
    id: 'lastfm',
    title: 'last.fm',
    icon: 'lastfm',
    url: 'https://www.last.fm/',
    scrobbler: true,
    roots: [lastfmRecentlyPlayed],
    sources: [
        createTopView('user.getTopTracks', {
            title: 'Top Tracks',
            itemType: ItemType.Media,
            layout: topTracksLayout,
        }),
        createTopView('user.getTopAlbums', {
            title: 'Top Albums',
            itemType: ItemType.Album,
            layout: albumLayout,
            secondaryLayout: albumTrackLayout,
        }),
        createTopView('user.getTopArtists', {
            title: 'Top Artists',
            itemType: ItemType.Artist,
            layout: artistLayout,
            secondaryLayout: albumLayout,
            tertiaryLayout: albumTrackLayout,
        }),
        lastfmHistory,
    ],

    observeIsLoggedIn,
    login,
    logout,
};

function createTopView<T extends MediaObject>(
    method: string,
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: `lastfm/top/${method.slice(11).toLowerCase()}`,
        icon: 'star',
        searchable: false,
        unplayable: true,

        search({period = 'overall'}: {period?: string} = {}): Pager<T> {
            return new LastFmPager(
                {
                    method,
                    period,
                    user: lastfmSettings.userId,
                },
                (response: any) => {
                    const [, topType] = method.toLowerCase().split('.');
                    const result = response[topType.slice(3)];
                    const attr = result['@attr'];
                    const resultType = topType.slice(6, -1);
                    const items = result[resultType];
                    const page = Number(attr.page) || 1;
                    const totalPages = Number(attr.totalPages) || 1;
                    const atEnd = totalPages === 1 || page === totalPages;
                    const total = Number(attr.total) || undefined;
                    return {items, total, atEnd, itemType: props.itemType};
                }
            );
        },
    };
}

export default lastfm;
