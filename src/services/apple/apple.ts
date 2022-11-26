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
import SimplePager from 'services/pagers/SimplePager';
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

const appleRecommendations: MediaSource<MediaPlaylist> = {
    id: 'apple/recommendations',
    title: 'Recommended',
    icon: 'playlists',
    itemType: ItemType.Playlist,
    defaultHidden: true,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            `/v1/me/recommendations`,
            ({data = [], next: nextPageUrl, meta}: any): MusicKitPage => {
                const items = data
                    .map((data: any) =>
                        data.relationships.contents.data.filter(
                            (data: any) => data.type === 'playlists'
                        )
                    )
                    .flat();
                const total = meta?.total;
                return {items, total, nextPageUrl};
            }
        );
    },
};

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

const appleLibrarySongs: MediaSource<MediaItem> = {
    id: 'apple/library-songs',
    title: 'My Songs',
    icon: 'note',
    itemType: ItemType.Media,
    layout: defaultLayout,
    defaultHidden: true,

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/library/songs`, toPage, {
            'include[library-songs]': 'catalog',
            'fields[library-songs]': 'playParams,name,artistName,albumName,artwork',
        });
    },
};

const appleLibraryAlbums: MediaSource<MediaAlbum> = {
    id: 'apple/library-albums',
    title: 'My Albums',
    icon: 'album',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new MusicKitPager(`/v1/me/library/albums`, toPage, {
            'include[library-albums]': 'catalog',
            'fields[library-albums]': 'playParams,name,artistName,artwork',
        });
    },
};

const appleLibraryPlaylists: MediaSource<MediaPlaylist> = {
    id: 'apple/playlists',
    title: 'My Playlists',
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
    roots: [
        appleSearch('songs', {title: 'Songs', itemType: ItemType.Media, layout: defaultLayout}),
        appleSearch('albums', {title: 'Albums', itemType: ItemType.Album}),
        appleSearch('artists', {title: 'Artists', itemType: ItemType.Artist}),
        appleSearch('playlists', {title: 'Playlists', itemType: ItemType.Playlist}),
    ],
    sources: [
        appleMusicVideos,
        appleRecentlyPlayed,
        appleLibrarySongs,
        appleLibraryAlbums,
        appleLibraryPlaylists,
        appleRecommendations,
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
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return search(q, searchType);
        },
    };
}

function toPage({data: items = [], next: nextPageUrl, meta}: any): MusicKitPage {
    const total = meta?.total;
    return {items, total, nextPageUrl};
}

export default apple;
