import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import {lf_api_key} from 'services/credentials';
import {observeIsLoggedIn, login, logout} from './lastfmAuth';
import LastFmPager from './LastFmPager';
import lastfmSettings from './lastfmSettings';
import './lastfmScrobbler';

console.log('module::lastfm');

const topTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'PlayCount'],
};

const recentTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
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

function getTop<T extends MediaObject>(method: string, itemType: ItemType): Pager<T> {
    return new LastFmPager(
        `method=${method}&user=${lastfmSettings.userId}&api_key=${lf_api_key}&format=json`,
        (response: any) => {
            const [, topType] = method.toLowerCase().split('.');
            const result = response[topType.slice(3)];
            const attr = result['@attr'];
            const resultType = topType.slice(6, -1);
            console.log({method, topType, resultType});
            const items = result[resultType];
            const total = Number(attr.total) || undefined;
            const atEnd = attr.page === attr.totalPages;
            return {items, total, atEnd, itemType};
        }
    );
}

const lastfmRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'lastfm/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: recentTracksLayout,
    unplayable: true,

    search(): Pager<MediaItem> {
        return new LastFmPager(
            `method=user.getRecentTracks&user=${lastfmSettings.userId}&api_key=${lf_api_key}&extended=1&format=json`,
            ({recenttracks}: any) => {
                const attr = recenttracks['@attr'];
                const items = recenttracks.track;
                const containsNowPlaying = items[0]?.['@attr']?.['nowplaying'] === 'true';
                const total = Number(attr.total) + (containsNowPlaying ? 1 : 0);
                const atEnd = attr.page === attr.totalPages;
                if (containsNowPlaying && attr.page !== '1') {
                    items.shift();
                }
                return {items, total, atEnd, itemType: ItemType.Media};
            }
        );
    },
};

const lastfm: MediaService = {
    id: 'lastfm',
    title: 'last.fm',
    icon: 'lastfm',
    sources: [lastfmRecentlyPlayed],
    searches: [
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
        id: method,
        icon: '',
        searchable: false,
        unplayable: true,

        search(): Pager<T> {
            return getTop(method, props.itemType);
        },
    };
}

export default lastfm;
