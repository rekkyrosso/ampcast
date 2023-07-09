import {Except} from 'type-fest';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import Pin from 'types/Pin';
import ViewType from 'types/ViewType';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import ratingStore from 'services/actions/ratingStore';
import subsonicApi from 'services/subsonic/subsonicApi';
import {bestOf, getTextFromHtml} from 'utils';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './navidromeAuth';
import NavidromePager from './NavidromePager';
import navidromeSettings from './navidromeSettings';

const serviceId: MediaServiceId = 'navidrome';

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'PlayCount'],
};

const navidromeLikedSongs: MediaSource<MediaItem> = {
    id: 'navidrome/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    viewType: ViewType.Ratings,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Artist', 'Title', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _order: 'DESC',
            _sort: 'starred_at',
            starred: true,
        });
    },
};

const navidromeLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'navidrome/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    viewType: ViewType.Ratings,

    search(): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {
            _order: 'DESC',
            _sort: 'starred_at',
            starred: true,
        });
    },
};

const navidromeLikedArtists: MediaSource<MediaArtist> = {
    id: 'navidrome/liked-artists',
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    viewType: ViewType.Ratings,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new NavidromePager(ItemType.Artist, 'artist', {
            _order: 'DESC',
            _sort: 'starred_at',
            starred: true,
        });
    },
};

const navidromeRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'navidrome/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    viewType: ViewType.RecentlyPlayed,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _order: 'DESC',
            _sort: 'play_date',
        });
    },
};

const navidromeMostPlayed: MediaSource<MediaItem> = {
    id: 'navidrome/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    viewType: ViewType.MostPlayed,
    layout: {
        view: 'details',
        fields: ['PlayCount', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _order: 'DESC',
            _sort: 'play_count',
        });
    },
};

const navidromePlaylists: MediaSource<MediaPlaylist> = {
    id: 'navidrome/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return new NavidromePager(ItemType.Playlist, 'playlist', {
            // owner_id: navidromeSettings.userId,
            _sort: 'name',
        });
    },
};

const navidrome: MediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Navidrome',
    url: 'https://www.navidrome.org/',
    defaultHidden: true,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs'}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists'}),
        createRoot(ItemType.Playlist, {title: 'Playlists'}),
    ],
    sources: [
        navidromeLikedSongs,
        navidromeLikedAlbums,
        navidromeLikedArtists,
        navidromeRecentlyPlayed,
        navidromeMostPlayed,
        navidromePlaylists,
    ],
    labels: {
        [Action.Like]: 'Add to Navidrome Favorites',
        [Action.Unlike]: 'Remove from Navidrome Favorites',
    },
    canRate,
    canStore: () => false,
    compareForRating,
    createSourceFromPin,
    getMetadata,
    lookup,
    rate,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default navidrome;

ratingStore.addObserver(navidrome);

function canRate<T extends MediaObject>(item: T): boolean {
    switch (item.itemType) {
        case ItemType.Media:
        case ItemType.Artist:
            return true;

        case ItemType.Album:
            return !item.synthetic;

        default:
            return false;
    }
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const [, , id] = pin.src.split(':');
            return new NavidromePager(ItemType.Playlist, `playlist/${id}`);
        },
    };
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    const itemType = item.itemType;
    const [, , id] = item.src.split(':');
    if (itemType === ItemType.Album && item.description === undefined) {
        const info = await subsonicApi.getAlbumInfo(id, false, navidromeSettings);
        item = {...item, description: getTextFromHtml(info.notes)};
    }
    if (!canRate(item) || item.rating !== undefined) {
        return item;
    }
    const rating = ratingStore.get(item);
    if (rating !== undefined) {
        return {...item, rating};
    }
    const type =
        itemType === ItemType.Artist ? 'artist' : itemType === ItemType.Album ? 'album' : 'song';
    const pager = new NavidromePager<T>(itemType, `${type}/${id}`, {
        pageSize: 1,
        maxSize: 1,
    });
    const items = await fetchFirstPage<T>(pager, {timeout: 2000});
    return bestOf(item, items[0]);
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
    const pager = new NavidromePager<MediaItem>(
        ItemType.Media,
        'song',
        {
            title: `${artist} ${title}`,
            _sort: 'order_artist_name,order_album_name,track_number',
        },
        options
    );
    return fetchFirstPage(pager, {timeout});
}

async function rate(item: MediaObject, rating: number): Promise<void> {
    const [, , id] = item.src.split(':');
    const method = rating ? 'star' : 'unstar';
    switch (item.itemType) {
        case ItemType.Media:
            await subsonicApi.get(method, {id}, navidromeSettings);
            break;

        case ItemType.Album:
            await subsonicApi.get(method, {albumId: id}, navidromeSettings);
            break;

        case ItemType.Artist:
            await subsonicApi.get(method, {artistId: id}, navidromeSettings);
            break;
    }
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `navidrome/search/${props.title.toLowerCase()}`,
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            switch (itemType) {
                case ItemType.Media:
                    return new NavidromePager(itemType, 'song', {
                        title: q,
                        _sort: 'order_artist_name,order_album_name,track_number',
                    });

                case ItemType.Album:
                    return new NavidromePager(itemType, 'album', {
                        name: q,
                        _sort: 'order_album_artist_name,order_album_name',
                    });

                case ItemType.Artist:
                    return new NavidromePager(itemType, 'artist', {name: q, _sort: 'name'});

                case ItemType.Playlist:
                    return new NavidromePager(itemType, 'playlist', {q, _sort: 'name'});

                default:
                    return new SimplePager();
            }
        },
    };
}
