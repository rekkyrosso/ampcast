import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import {Pin} from 'types/Pin';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './appleAuth';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';

console.log('module::apple');

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const defaultArtistLayout: MediaSourceLayout<MediaArtist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Genre'],
};

export const appleMusicVideos: MediaSource<MediaItem> = {
    id: 'apple/video',
    title: 'Music Video',
    icon: 'video',
    itemType: ItemType.Media,
    searchable: true,
    layout: defaultLayout,
    defaultHidden: true,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        if (q) {
            return createSearchPager(ItemType.Media, q, {types: 'music-videos'}, {maxSize: 100});
        } else {
            return new SimplePager();
        }
    },
};

const appleRecommendations: MediaSource<MediaPlaylist> = {
    id: 'apple/recommendations',
    title: 'Recommended',
    icon: 'playlist',
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
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/recent/played/tracks`, toPage, undefined, {pageSize: 30});
    },
};

const appleLibrarySongs: MediaSource<MediaItem> = {
    id: 'apple/library-songs',
    title: 'My Songs',
    icon: 'heart',
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
    icon: 'heart',
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
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(`/v1/me/library/playlists`, toPage, {
            'include[library-playlists]': 'catalog',
            'fields[library-playlists]': 'playParams,name,artwork',
        });
    },
};

const apple: MediaService = {
    id: 'apple',
    name: 'Apple Music',
    icon: 'apple',
    url: 'https://music.apple.com/',
    roots: [
        createRoot(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists', layout: defaultArtistLayout}),
        createRoot(ItemType.Playlist, {title: 'Playlists'}),
    ],
    sources: [
        appleMusicVideos,
        appleRecentlyPlayed,
        appleLibrarySongs,
        appleLibraryAlbums,
        appleLibraryPlaylists,
        appleRecommendations,
    ],

    canRate,
    createSourceFromPin,
    lookup,
    rate,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

function createSourceFromPin(pin: Pin): MediaSource<MediaItem> {
    return {
        title: pin.title,
        itemType: ItemType.Media,
        id: pin.src,
        icon: 'pin',
        isPin: true,
        layout: {...defaultLayout, view: 'card compact'},

        search(): Pager<MediaItem> {
            const [, , id] = pin.src.split(':');
            const path = pin.isLibraryItem ? `/v1/me/library` : `/v1/catalog/{{storefrontId}}`;
            return MusicKitPager.create<MediaItem>(`${path}/playlists/${id}`, {
                include: 'tracks,catalog',
                'fields[library-playlists]': 'playParams,name,artwork,url,tracks',
            });
        },
    };
}

async function rate(): Promise<void> {
    throw Error('Not implemented.');
}

function canRate(): boolean {
    return false;
}

async function lookup(
    artist: string,
    title: string,
    limit = 10,
    timeout?: number
): Promise<readonly MediaItem[]> {
    if (!artist || !title) {
        return [];
    }
    const options: Partial<PagerConfig> = {pageSize: limit, maxSize: limit, lookup: true};
    const pager = createSearchPager<MediaItem>(
        ItemType.Media,
        `${artist} ${title}`,
        undefined,
        options
    );
    return fetchFirstPage(pager, timeout);
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
        const params: Record<string, string> = {...filters, term: q};
        if (!params.types) {
            switch (itemType) {
                case ItemType.Media:
                    params.types = 'songs';
                    break;

                case ItemType.Album:
                    params.types = 'albums';
                    break;

                case ItemType.Artist:
                    params.types = 'artists';
                    break;

                case ItemType.Playlist:
                    params.types = 'playlists';
                    break;
            }
        }
        const type = params.types;
        return new MusicKitPager(
            `/v1/catalog/{{storefrontId}}/search`,
            (response: any): MusicKitPage => {
                const result = response.results[type] || {data: []};
                const nextPageUrl = result.next;
                const total = response.meta?.total;
                return {items: result.data, total, nextPageUrl};
            },
            params,
            {maxSize: 250, pageSize: 25, ...options}
        );
    } else {
        return new SimplePager<T>();
    }
}

function toPage({data: items = [], next: nextPageUrl, meta}: any): MusicKitPage {
    const total = meta?.total;
    return {items, total, nextPageUrl};
}

export default apple;
