import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import Pager, {PagerConfig} from 'types/Pager';
import SimplePager from 'services/pagers/SimplePager';
import plexSettings from './plexSettings';
import {observeIsLoggedIn, login, logout} from './plexAuth';
import PlexPager from './PlexPager';
import './plexReporting';

console.log('module::plex');

export function plexSearch<T extends MediaObject>(
    q: string,
    mediaType = '10',
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        return new PlexPager<T>(
            `/library/sections/${plexSettings.libraryId}/all`,
            {
                title: q,
                type: mediaType,
            },
            options
        );
    } else {
        return new SimplePager<T>();
    }
}

const plexMusicVideo: MediaSource<MediaItem> = {
    id: 'plex/video',
    title: 'Music Video',
    icon: 'video',
    itemType: ItemType.Media,
    searchable: true,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${plexSettings.libraryId}/extras/all`, {
            title: q,
            type: '8', // artist
            extraType: '4', // video
        });
    },
};

const plexRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'plex/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${plexSettings.libraryId}/all`, {
            type: '10', // track
            'lastViewedAt>': '0',
            sort: 'lastViewedAt:desc',
        });
    },
};

const plexMostPlayed: MediaSource<MediaItem> = {
    id: 'plex/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${plexSettings.libraryId}/all`, {
            type: '10', // track
            'viewCount>': '1',
            sort: 'viewCount:desc,lastViewedAt:desc',
        });
    },
};

const plexTopRated: MediaSource<MediaItem> = {
    id: 'plex/top-rated',
    title: 'Top Rated',
    icon: 'star',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new PlexPager(`/library/sections/${plexSettings.libraryId}/all`, {
            type: '10', // track
            'track.userRating>': '1',
            sort: 'track.userRating:desc,viewCount:desc,lastViewedAt:desc',
        });
    },
};

const plexPlaylists: MediaSource<MediaPlaylist> = {
    id: 'plex/playlists',
    title: 'Playlists',
    icon: 'playlists',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new PlexPager(`/playlists/all`, {
            type: '15', // playlist
            playlistType: 'audio',
        });
    },
};

const plex: MediaService = {
    id: 'plex',
    title: 'Plex',
    icon: 'plex',
    url: 'https://www.plex.tv/',
    roots: [
        createSearch('10', {title: 'Songs', itemType: ItemType.Media}),
        createSearch('9', {title: 'Albums', itemType: ItemType.Album}),
        createSearch('8', {title: 'Artists', itemType: ItemType.Artist}),
        createSearch('15', {title: 'Playlists', itemType: ItemType.Playlist}),
    ],
    sources: [plexMusicVideo, plexMostPlayed, plexRecentlyPlayed, plexTopRated, plexPlaylists],

    observeIsLoggedIn,
    login,
    logout,
};

function createSearch<T extends MediaObject>(
    searchType: string,
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: searchType,
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return plexSearch(q, searchType);
        },
    };
}

export default plex;
