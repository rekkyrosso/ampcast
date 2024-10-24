import {Except} from 'type-fest';
import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import PersonalMediaService from 'types/PersonalMediaService';
import PlayableItem from 'types/PlayableItem';
import Pin from 'types/Pin';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import SimplePager from 'services/pagers/SimplePager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {t} from 'services/i18n';
import subsonicScrobbler from 'services/subsonic/factory/subsonicScrobbler';
import {bestOf, getTextFromHtml} from 'utils';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './navidromeAuth';
import NavidromePager from './NavidromePager';
import navidromeSettings from './navidromeSettings';
import navidromeApi from './navidromeApi';
import subsonicApi from './subsonicApi';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';
import ServerSettings from './components/NavidromeServerSettings';

const serviceId: MediaServiceId = 'navidrome';

const songSort = 'order_album_artist_name,order_album_name,disc_number,track_number';
const albumSort = 'order_album_artist_name,order_album_name';

const playlistLayout: MediaSourceLayout<MediaPlaylist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'TrackCount', 'Blurb'],
};

const playlistItemsLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Index', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

const navidromeSearch: MediaMultiSource = {
    id: 'navidrome/search',
    title: 'Search',
    icon: 'search',
    sources: [
        createSearch<MediaItem>(ItemType.Media, {title: 'Songs'}),
        createSearch<MediaAlbum>(ItemType.Album, {title: 'Albums'}),
        createSearch<MediaArtist>(ItemType.Artist, {title: 'Artists'}),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            title: 'Playlists',
            layout: playlistLayout,
            secondaryLayout: playlistItemsLayout,
        }),
    ],
};

const navidromeLikedSongs: MediaSource<MediaItem> = {
    id: 'navidrome/liked-songs',
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Artist', 'Title', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            starred: true,
            _sort: 'starred_at',
            _order: 'DESC',
        });
    },
};

const navidromeLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'navidrome/liked-albums',
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {
            starred: true,
            _sort: 'starred_at',
            _order: 'DESC',
        });
    },
};

const navidromeLikedArtists: MediaSource<MediaArtist> = {
    id: 'navidrome/liked-artists',
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new NavidromePager(ItemType.Artist, 'artist', {
            starred: true,
            _sort: 'starred_at',
            _order: 'DESC',
        });
    },
};

const navidromeRecentlyAdded: MediaSource<MediaAlbum> = {
    id: 'navidrome/recently-added',
    title: 'Recently Added',
    icon: 'recently-added',
    itemType: ItemType.Album,
    defaultHidden: true,

    search(): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {
            _sort: 'recently_added',
            _order: 'DESC',
        });
    },
};

const navidromeRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'navidrome/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _sort: 'play_date',
            _order: 'DESC',
        });
    },
};

const navidromeMostPlayed: MediaSource<MediaItem> = {
    id: 'navidrome/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    layout: {
        view: 'details',
        fields: ['PlayCount', 'Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _sort: 'play_count',
            _order: 'DESC',
        });
    },
};

const navidromePlaylists: MediaSource<MediaPlaylist> = {
    id: 'navidrome/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    layout: playlistLayout,
    secondaryLayout: playlistItemsLayout,

    search(): Pager<MediaPlaylist> {
        return new NavidromePager(ItemType.Playlist, 'playlist', {
            _sort: 'name',
        });
    },
};

const navidromeTracksByGenre: MediaSource<MediaItem> = {
    id: 'navidrome/tracks-by-genre',
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    component: FilterBrowser,
    defaultHidden: true,

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new NavidromePager(ItemType.Media, 'song', {
                genre_id: genre.id,
                _sort: songSort,
            });
        } else {
            return new SimplePager();
        }
    },
};

const navidromeAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: 'navidrome/albums-by-genre',
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    component: FilterBrowser,

    search(genre?: MediaFilter): Pager<MediaAlbum> {
        if (genre) {
            return new NavidromePager(ItemType.Album, 'album', {
                genre_id: genre.id,
                _sort: albumSort,
            });
        } else {
            return new SimplePager();
        }
    },
};

const navidromeArtistsByGenre: MediaSource<MediaArtist> = {
    id: 'navidrome/artists-by-genre',
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    component: FilterBrowser,
    defaultHidden: true,

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new NavidromePager(ItemType.Artist, 'artist', {
                genre_id: genre.id,
                _sort: 'name',
            });
        } else {
            return new SimplePager();
        }
    },
};

const navidromeRandomTracks: MediaSource<MediaItem> = {
    id: 'navidrome/random-tracks',
    title: 'Random Songs',
    icon: 'shuffle',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {_sort: 'random'}, {maxSize: 100});
    },
};

const navidromeRandomAlbums: MediaSource<MediaAlbum> = {
    id: 'navidrome/random-albums',
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {_sort: 'random'}, {maxSize: 100});
    },
};

const navidrome: PersonalMediaService = {
    id: serviceId,
    icon: serviceId,
    name: 'Navidrome',
    url: 'https://www.navidrome.org',
    serviceType: ServiceType.PersonalMedia,
    components: {ServerSettings},
    defaultHidden: true,
    root: navidromeSearch,
    sources: [
        navidromeLikedSongs,
        navidromeLikedAlbums,
        navidromeLikedArtists,
        navidromeRecentlyAdded,
        navidromeRecentlyPlayed,
        navidromeMostPlayed,
        navidromePlaylists,
        navidromeTracksByGenre,
        navidromeAlbumsByGenre,
        navidromeArtistsByGenre,
        navidromeRandomTracks,
        navidromeRandomAlbums,
    ],
    labels: {
        [Action.AddToLibrary]: t('Add to Navidrome Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Navidrome Favorites'),
    },
    editablePlaylists: navidromePlaylists,
    get host(): string {
        return navidromeSettings.host;
    },
    addToPlaylist,
    canRate: () => false,
    canStore,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    getFilters,
    getMetadata,
    getPlayableUrl,
    getServerInfo,
    getThumbnailUrl,
    lookup,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default navidrome;

function canStore<T extends MediaObject>(item: T): boolean {
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

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    const playlistId = getIdFromSrc(playlist);
    return navidromeApi.addToPlaylist(playlistId, items.map(getIdFromSrc));
}

async function createPlaylist<T extends MediaItem>(
    name: string,
    {description = '', isPublic = false, items = []}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await navidromeApi.createPlaylist(
        name,
        description,
        isPublic,
        items.map(getIdFromSrc)
    );
    return {
        src: `navidrome:playlist:${playlist.id}`,
        title: name,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
    };
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,

        search(): Pager<MediaPlaylist> {
            const id = getIdFromSrc(pin);
            return new NavidromePager(ItemType.Playlist, `playlist/${id}`);
        },
    };
}

async function getFilters(filterType: FilterType): Promise<readonly MediaFilter[]> {
    if (filterType === FilterType.ByDecade) {
        return subsonicApi.getDecades();
    } else {
        return navidromeApi.getGenres();
    }
}

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    const itemType = item.itemType;
    const id = getIdFromSrc(item);
    if (itemType === ItemType.Album) {
        if (item.synthetic) {
            return item;
        }
        if (item.description === undefined) {
            const info = await subsonicApi.getAlbumInfo(id, false);
            item = {
                ...item,
                description: getTextFromHtml(info.notes),
                release_mbid: info.musicBrainzId,
            };
        }
    } else if (itemType === ItemType.Artist && item.description === undefined) {
        const info = await subsonicApi.getArtistInfo(id);
        item = {
            ...item,
            description: getTextFromHtml(info.biography),
            artist_mbid: info.musicBrainzId,
        };
    }
    if (!canStore(item) || item.inLibrary !== undefined) {
        return item;
    }
    const inLibrary = actionsStore.getInLibrary(item);
    if (inLibrary !== undefined) {
        return {...item, inLibrary};
    }
    const type =
        itemType === ItemType.Artist ? 'artist' : itemType === ItemType.Album ? 'album' : 'song';
    const pager = new NavidromePager<T>(itemType, `${type}/${id}`, undefined, {
        pageSize: 1,
        maxSize: 1,
    });
    const items = await fetchFirstPage<T>(pager, {timeout: 2000});
    return bestOf(item, items[0]);
}

function getPlayableUrl(item: PlayableItem): string {
    return subsonicApi.getPlayableUrl(item);
}

async function getServerInfo(): Promise<Record<string, string>> {
    return subsonicApi.getServerInfo();
}

function getThumbnailUrl(url: string): string {
    return url.replace('{navidrome-credentials}', navidromeSettings.credentials);
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

function scrobble(): void {
    subsonicScrobbler.scrobble(navidrome, subsonicApi);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const id = getIdFromSrc(item);
    const method = inLibrary ? 'star' : 'unstar';
    switch (item.itemType) {
        case ItemType.Media:
            await subsonicApi.get(method, {id});
            break;

        case ItemType.Album:
            await subsonicApi.get(method, {albumId: id});
            break;

        case ItemType.Artist:
            await subsonicApi.get(method, {artistId: id});
            break;
    }
}

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: props.title,
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            q = q.trim();
            switch (itemType) {
                case ItemType.Media:
                    return new NavidromePager(itemType, 'song', {
                        title: q,
                        _sort: songSort,
                    });

                case ItemType.Album:
                    return new NavidromePager(itemType, 'album', {
                        name: q,
                        _sort: albumSort,
                    });

                case ItemType.Artist:
                    return new NavidromePager(itemType, 'artist', {name: q, _sort: 'name'});

                case ItemType.Playlist:
                    return new NavidromePager(itemType, 'playlist', {q, _sort: 'name'});

                default:
                    throw TypeError('Search not supported for this type of media');
            }
        },
    };
}

function getIdFromSrc({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}
