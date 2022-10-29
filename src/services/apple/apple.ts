import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import SimplePager from 'services/SimplePager';
import {observeIsLoggedIn, login, logout} from './appleAuth';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';

console.log('module::apple');

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

function search<T extends MediaObject>(
    q: string,
    type = 'songs',
    config?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        return new MusicKitPager(
            `/v1/catalog/{{storefrontId}}/search`,
            (response: any): MusicKitPage => {
                const result = response.results[type] || {data: []};
                const nextPageUrl = result.next;
                const total = response.meta?.total;
                return {items: result.data, total, nextPageUrl};
            },
            {term: q, types: type},
            {maxSize: 250, pageSize: 25, ...config}
        );
    } else {
        return new SimplePager<T>();
    }
}

const appleMusicVideos: MediaSource<MediaItem> = {
    id: 'apple/video',
    title: 'Music Video',
    icon: 'video',
    itemType: ItemType.Media,
    searchable: true,
    layout: defaultLayout,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        if (q) {
            return search(q, 'music-videos', {maxSize: 100});
        } else {
            return new SimplePager();
        }
    },
};

// const appleRecentlyAdded: MediaSource<MediaItem> = {
//     id: 'apple/recently-added',
//     title: 'Recently Added',
//     icon: 'recently-added',
//     itemType: ItemType.Media,
//     layout: defaultLayout,

//     search(): Pager<MediaItem> {
//         return new MusicKitPager(
//             `/v1/me/library/recently-added`, toPage, {pageSizeDeterminedBy: 'response', sequential: true}
//         );
//     },
// };

const appleRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'apple/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/recent/played/tracks`, toPage, undefined, {pageSize: 30});
    },
};

const appleLikedSongs: MediaSource<MediaItem> = {
    id: 'apple/liked-songs',
    title: 'Liked Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/library/songs`, toPage, {
            'include[library-songs]': 'catalog',
            'fields[library-songs]': 'playParams,name,artistName,albumName,artwork',
        });
    },
};

const appleLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'apple/liked-albums',
    title: 'Liked Albums',
    icon: 'heart',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new MusicKitPager(`/v1/me/library/albums`, toPage, {
            'include[library-albums]': 'catalog',
            'fields[library-albums]': 'playParams,name,artistName,artwork',
        });
    },
};

const applePlaylists: MediaSource<MediaPlaylist> = {
    id: 'apple/playlists',
    title: 'Playlists',
    icon: 'playlists',
    itemType: ItemType.Playlist,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'Owner', 'TrackCount'],
    },

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(`/v1/me/library/playlists`, toPage, {
            'include[library-playlists]': 'catalog',
            'fields[library-playlists]': 'playParams,name,artwork',
        });
    },
};

const apple: MediaService = {
    id: 'apple',
    title: 'Apple Music',
    icon: 'apple',
    url: 'https://music.apple.com/',
    searches: [
        appleSearch('songs', {title: 'Songs', itemType: ItemType.Media, layout: defaultLayout}),
        appleSearch('albums', {title: 'Albums', itemType: ItemType.Album}),
        appleSearch('artists', {title: 'Artists', itemType: ItemType.Artist}),
        appleSearch('playlists', {title: 'Playlists', itemType: ItemType.Playlist}),
    ],
    sources: [
        appleMusicVideos,
        // appleRecentlyAdded,
        appleRecentlyPlayed,
        appleLikedSongs,
        appleLikedAlbums,
        applePlaylists,
    ],

    observeIsLoggedIn,
    login,
    logout,
};

function appleSearch<T extends MediaObject>(
    searchType: string,
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: `apple/search/${searchType}`,
        icon: '',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return search(q, searchType);
        },
    };
}

function toPage(response: any): MusicKitPage {
    const items = response.data;
    const nextPageUrl = response.next;
    const total = response.meta?.total;
    return {items, total, nextPageUrl};
}

export default apple;
