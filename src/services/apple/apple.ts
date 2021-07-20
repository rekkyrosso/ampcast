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
import MusicKitPager from './MusicKitPager';

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
        const pathname = `/v1/catalog/{{storefrontId}}/search`;
        const search = new URLSearchParams({term: q, types: type});
        const href = `${pathname}?${search}`;

        return new MusicKitPager(
            href,
            (response: any) => {
                const result = response.results[type] || {data: []};
                const nextPageUrl = result.next;
                const total = response.meta?.total;
                return {items: result.data, total, nextPageUrl};
            },
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

    search(q: string): Pager<MediaItem> {
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
//             `/v1/me/library/recently-added`,
//             (response: any) => {
//                 const items = response.data;
//                 const nextPageUrl = response.next;
//                 const total = response.meta?.total;
//                 return {items, total, nextPageUrl};
//             },
//             {pageSizeDeterminedBy: 'response', sequential: true}
//         );
//     },
// };

const appleRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'apple/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new MusicKitPager(
            `/v1/me/recent/played/tracks`,
            (response: any) => {
                const items = response.data;
                const nextPageUrl = response.next;
                const total = response.meta?.total;
                return {items, total, nextPageUrl};
            },
            {pageSize: 30}
        );
    },
};

const appleLikedSongs: MediaSource<MediaItem> = {
    id: 'apple/liked-songs',
    title: 'Liked Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/library/songs`, (response: any) => {
            const items = response.data;
            const nextPageUrl = response.next;
            const total = response.meta?.total;
            return {items, total, nextPageUrl};
        });
    },
};

const appleLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'apple/liked-albums',
    title: 'Liked Albums',
    icon: 'heart',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new MusicKitPager(`/v1/me/library/albums`, (response: any) => {
            const items = response.data;
            const nextPageUrl = response.next;
            const total = response.meta?.total;
            return {items, total, nextPageUrl};
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
        fields: ['Thumbnail', 'Title', 'TrackCount'],
    },

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(`/v1/me/library/playlists`, (response: any) => {
            const items = response.data;
            const nextPageUrl = response.next;
            const total = response.meta?.total;
            return {items, total, nextPageUrl};
        });
    },
};

const apple: MediaService = {
    id: 'apple',
    title: 'Apple Music',
    icon: 'apple',
    searches: [
        createSearch('songs', {title: 'Songs', itemType: ItemType.Media, layout: defaultLayout}),
        createSearch('albums', {title: 'Albums', itemType: ItemType.Album}),
        createSearch('artists', {title: 'Artists', itemType: ItemType.Artist}),
        createSearch('playlists', {title: 'Playlists', itemType: ItemType.Playlist}),
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

function createSearch<T extends MediaObject>(
    searchType: string,
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: `apple/search/${searchType}`,
        icon: '',
        searchable: true,

        search(q: string): Pager<T> {
            return search(q, searchType);
        },
    };
}

export default apple;
