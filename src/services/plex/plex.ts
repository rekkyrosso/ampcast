import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {uniqBy} from 'utils/index';
import plexSettings from './plexSettings';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './plexAuth';
import PlexPager from './PlexPager';

console.log('module::plex');

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
};

const plexMusicVideo: MediaSource<MediaItem> = {
    id: 'plex/video',
    title: 'Music Video',
    icon: 'video',
    itemType: ItemType.Media,
    searchable: true,
    layout: defaultLayout,

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
    layout: defaultLayout,

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
    layout: defaultLayout,

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
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return new PlexPager('/playlists/all', {
            type: '15', // playlist
            playlistType: 'audio',
        });
    },
};

const plex: MediaService = {
    id: 'plex',
    name: 'Plex',
    icon: 'plex',
    url: 'https://www.plex.tv/',
    lookup: plexLookup,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists', secondaryLayout: playlistItemsLayout}),
    ],
    sources: [plexMusicVideo, plexMostPlayed, plexRecentlyPlayed, plexTopRated, plexPlaylists],

    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export async function plexLookup(
    artist: string,
    title: string,
    limit = 10,
    timeout?: number
): Promise<readonly MediaItem[]> {
    if (!artist || !title) {
        return [];
    }
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit};
    const lookup = async (filter: Record<string, string>): Promise<readonly MediaItem[]> =>
        fetchFirstPage(createSearchPager(ItemType.Media, title, filter, options), timeout);
    const results = await Promise.all([
        lookup({'artist.title': artist}),
        lookup({originalTitle: artist}),
    ]);
    return uniqBy(results.flat(), 'src');
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: String(itemType),
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q);
        },
    };
}

function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    filters?: Record<string, string>,
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        const path =
            itemType === ItemType.Playlist
                ? '/playlists/all'
                : `/library/sections/${plexSettings.libraryId}/all`;
        const params: Record<string, string> = {...filters, title: q};
        switch (itemType) {
            case ItemType.Media:
                params.type = '10';
                break;

            case ItemType.Album:
                params.type = '9';
                break;

            case ItemType.Artist:
                params.type = '8';
                break;

            case ItemType.Playlist:
                params.playlistType = 'audio';
                params.type = '15';
                break;
        }
        return new PlexPager<T>(path, params, options);
    } else {
        return new SimplePager<T>();
    }
}

export default plex;
