import {Except, Writable} from 'type-fest';
import Action from 'types/Action';
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
import Pin from 'types/Pin';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import SimplePager from 'services/pagers/SimplePager';
import {bestOf} from 'utils';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './appleAuth';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';

console.log('module::apple');

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
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
            undefined,
            undefined,
            undefined,
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
        return new MusicKitPager(`/v1/me/recent/played/tracks`, undefined, {
            pageSize: 30,
            maxSize: 200,
        });
    },
};

const appleLibrarySongs: MediaSource<MediaItem> = {
    id: 'apple/library-songs',
    title: 'My Songs',
    icon: 'tick',
    itemType: ItemType.Media,
    layout: defaultLayout,
    defaultHidden: true,

    search(): Pager<MediaItem> {
        return new MusicKitPager(`/v1/me/library/songs`);
    },
};

const appleLibraryAlbums: MediaSource<MediaAlbum> = {
    id: 'apple/library-albums',
    title: 'My Albums',
    icon: 'tick',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new MusicKitPager(`/v1/me/library/albums`, {
            'fields[library-albums]': 'name,artistName,playParams',
            'include[library-albums]': 'catalog',
        });
    },
};

const appleLibraryArtists: MediaSource<MediaArtist> = {
    id: 'apple/library-artists',
    title: 'My Artists',
    icon: 'tick',
    itemType: ItemType.Artist,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new MusicKitPager(`/v1/me/library/artists`, {
            'fields[library-artists]': 'name,playParams',
            'include[library-artists]': 'catalog',
            'omit[resource:artists]': 'relationships',
        });
    },
};

const appleLibraryPlaylists: MediaSource<MediaPlaylist> = {
    id: 'apple/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(`/v1/me/library/playlists`, {
            'fields[library-playlists]': 'name,playParams',
            'include[library-playlists]': 'catalog',
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
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists'}),
    ],
    sources: [
        appleLibrarySongs,
        appleLibraryAlbums,
        appleLibraryArtists,
        appleRecentlyPlayed,
        appleLibraryPlaylists,
        appleRecommendations,
        appleMusicVideos,
    ],
    labels: {
        [Action.AddToLibrary]: 'Add to Apple Music Library',
        [Action.RemoveFromLibrary]: 'Saved to Apple Music Library',
        [Action.Like]: 'Love on Apple Music',
        [Action.Unlike]: 'Unlove on Apple Music',
    },

    canRate,
    canStore,
    compareForRating,
    createSourceFromPin,
    getMetadata,
    lookup,
    rate,
    store,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function canRate<T extends MediaObject>(item: T, inline?: boolean): boolean {
    switch (item.itemType) {
        case ItemType.Album:
            return !inline && !item.synthetic;

        case ItemType.Media:
        case ItemType.Playlist:
            return !inline;

        default:
            return false;
    }
}

function canStore<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Media:
        case ItemType.Playlist:
            return true;

        case ItemType.Album:
            return !item.synthetic;

        default:
            return false;
    }
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const [, type, id] = pin.src.split(':');
            const isLibraryItem = type.startsWith('library-');
            const path = isLibraryItem ? `/v1/me/library` : `/v1/catalog/{{storefrontId}}`;
            return new MusicKitPager(
                `${path}/playlists/${id}`,
                isLibraryItem
                    ? {
                          'include[library-playlists]': 'catalog',
                          'fields[library-playlists]': 'name,playParams',
                      }
                    : {
                          'omit[resource:playlists]': 'relationships',
                      }
            );
        },
    };
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    const hasMetadata = !!item.externalUrl; // this field is not available on library items
    if (hasMetadata) {
        return item;
    }
    const [, type, id] = item.src.split(':');
    const isLibraryItem = type.startsWith('library-');
    const path = isLibraryItem ? `/v1/me/library` : `/v1/catalog/{{storefrontId}}`;
    const pager = new MusicKitPager<T>(
        `${path}/${type.replace('library-', '')}/${id}${isLibraryItem ? '/catalog' : ''}`,
        isLibraryItem
            ? undefined
            : {[`omit[resource:${type.replace('library-', '')}]`]: 'relationships'},
        {lookup: true}
    );
    const items = await fetchFirstPage<T>(pager, {timeout: 2000});
    const result = bestOf(item, items[0]) as Writable<T>;
    result.description = items[0]?.description || item.description;
    return result;
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
    const pager = createSearchPager<MediaItem>(ItemType.Media, `${artist} ${title}`, undefined, {
        pageSize: limit,
        maxSize: limit,
        lookup: true,
    });
    return fetchFirstPage(pager, {timeout});
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    const musicKit = MusicKit.getInstance();
    const [, type, id] = item.src.split(':');
    const path = `/v1/me/ratings/${type}/${id}`;

    if (rating) {
        await musicKit.api.music(path, undefined, {
            fetchOptions: {
                method: 'PUT',
                body: JSON.stringify({
                    type: 'rating',
                    attributes: {
                        value: rating,
                    },
                }),
            },
        });
    } else {
        await musicKit.api.music(path, undefined, {fetchOptions: {method: 'DELETE'}});
    }
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const musicKit = MusicKit.getInstance();
    const [, type] = item.src.split(':');
    const kind = type.replace('library-', '');
    const id = item.apple?.catalogId;
    const path = `/v1/me/library`;

    if (inLibrary) {
        const key = `ids[${kind}]`;
        return musicKit.api.music(path, {[key]: id}, {fetchOptions: {method: 'POST'}});
    } else {
        // This doesn't currently work.
        // https://developer.apple.com/forums/thread/107807
        return musicKit.api.music(`${path}/${kind}/${id}`, undefined, {
            fetchOptions: {method: 'DELETE'},
        });
    }
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
    filters?: MusicKit.QueryParameters,
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        const params: MusicKit.QueryParameters = {...filters, term: q};
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
            params[`omit[resource:${params.types}]`] = 'relationships';
        }
        const type = params.types;
        return new MusicKitPager(
            `/v1/catalog/{{storefrontId}}/search`,
            params,
            {maxSize: 250, pageSize: 25, ...options},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results[type] || {data: []};
                const nextPageUrl = result.next;
                const total = response.meta?.total;
                return {items: result.data, total, nextPageUrl};
            }
        );
    } else {
        return new SimplePager<T>();
    }
}

export default apple;
