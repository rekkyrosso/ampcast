import {Except} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import {t} from 'services/i18n';
import SimplePager from 'services/pagers/SimplePager';
import NavidromePager from './NavidromePager';
import {createArtistAlbumsPager, createPlaylistItemsPager} from './navidromeUtils';
import {
    defaultMediaItemCard,
    mostPlayedTracksLayout,
    radiosLayoutSmall,
    recentlyAddedAlbumsLayout,
    recentlyPlayedTracksLayout,
} from 'components/MediaList/layouts';

const serviceId: MediaServiceId = 'navidrome';

const navidromeArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        name: 'Title',
        max_year: 'Year',
    },
    defaultSort: {
        sortBy: 'max_year',
        sortOrder: -1,
    },
};

const navidromePlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Description',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['Name', 'Description', 'TrackCount', 'Progress'],
};

const navidromePlaylistItemsLayout: Partial<MediaListLayout> = {
    card: defaultMediaItemCard,
    details: ['Position', 'Title', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
};

export const navidromePlaylistItemsSort: MediaListSort = {
    sortOptions: {
        id: 'Position',
        title: 'Title',
        artist: 'Artist',
    },
    defaultSort: {
        sortBy: 'id',
        sortOrder: 1,
    },
};

export const navidromePlaylistItems: MediaSourceItems = {
    layout: navidromePlaylistItemsLayout,
    sort: navidromePlaylistItemsSort,
};

export const navidromeSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {
            id: 'songs',
            title: 'Songs',
            primaryItems: {layout: {view: 'details'}},
        }),
        createSearch<MediaAlbum>(ItemType.Album, {
            id: 'albums',
            title: 'Albums',
        }),
        createSearch<MediaArtist>(ItemType.Artist, {
            id: 'artists',
            title: 'Artists',
            secondaryItems: {sort: navidromeArtistAlbumsSort},
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            primaryItems: {layout: navidromePlaylistLayout},
            secondaryItems: navidromePlaylistItems,
        }),
    ],
};

const navidromeLikedSongs: MediaSource<MediaItem> = {
    id: `${serviceId}/liked-songs`,
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    primaryItems: {
        sort: {
            sortOptions: {
                title: 'Title',
                artist: 'Artist',
                album: 'Album',
                albumArtist: 'Album Artist',
                starred_at: t(`Date Favorited`),
            },
            defaultSort: {
                sortBy: 'starred_at',
                sortOrder: -1,
            },
        },
    },

    search(
        _,
        {sortBy, sortOrder} = navidromeLikedSongs.primaryItems!.sort!.defaultSort
    ): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            starred: true,
            _sort: sortBy,
            _order: sortOrder === -1 ? 'DESC' : 'ASC',
        });
    },
};

const navidromeLikedAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/liked-albums`,
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,
    primaryItems: {
        sort: {
            sortOptions: {
                name: 'Title',
                albumArtist: 'Artist',
                max_year: 'Year',
                starred_at: t(`Date Favorited`),
            },
            defaultSort: {
                sortBy: 'starred_at',
                sortOrder: -1,
            },
        },
    },

    search(
        _,
        {sortBy, sortOrder} = navidromeLikedAlbums.primaryItems!.sort!.defaultSort
    ): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {
            starred: true,
            _sort: sortBy,
            _order: sortOrder === -1 ? 'DESC' : 'ASC',
        });
    },
};

const navidromeLikedArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/liked-artists`,
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,
    primaryItems: {
        sort: {
            sortOptions: {
                name: 'Name',
                starred_at: t(`Date Favorited`),
            },
            defaultSort: {
                sortBy: 'name',
                sortOrder: 1,
            },
        },
    },
    secondaryItems: {
        sort: navidromeArtistAlbumsSort,
    },

    search(
        _,
        {sortBy, sortOrder} = navidromeLikedArtists.primaryItems!.sort!.defaultSort
    ): Pager<MediaArtist> {
        return new NavidromePager(
            ItemType.Artist,
            'artist',
            {
                starred: true,
                _sort: sortBy,
                _order: sortOrder === -1 ? 'DESC' : 'ASC',
            },
            {
                childSort: navidromeArtistAlbumsSort.defaultSort,
                childSortId: `${navidromeLikedArtists.id}/2`,
            },
            createArtistAlbumsPager
        );
    },
};

const navidromeRecentlyAdded: MediaSource<MediaAlbum> = {
    id: `${serviceId}/recently-added`,
    title: 'Recently Added',
    icon: 'recently-added',
    itemType: ItemType.Album,
    primaryItems: {
        layout: recentlyAddedAlbumsLayout,
    },

    search(): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {
            _sort: 'recently_added',
            _order: 'DESC',
        });
    },
};

const navidromeRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    primaryItems: {
        layout: recentlyPlayedTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _sort: 'play_date',
            _order: 'DESC',
        });
    },
};

const navidromeMostPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/most-played`,
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    primaryItems: {
        layout: mostPlayedTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {
            _sort: 'play_count',
            _order: 'DESC',
        });
    },
};

export const navidromePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: navidromePlaylistLayout,
        sort: {
            sortOptions: {
                name: 'Name',
                updatedAt: 'Date Edited',
            },
            defaultSort: {
                sortBy: 'updatedAt',
                sortOrder: -1,
            },
        },
    },
    secondaryItems: navidromePlaylistItems,

    search(
        _,
        {sortBy, sortOrder} = navidromePlaylists.primaryItems!.sort!.defaultSort
    ): Pager<MediaPlaylist> {
        return new NavidromePager(
            ItemType.Playlist,
            'playlist',
            {
                _sort: sortBy,
                _order: sortOrder === -1 ? 'DESC' : 'ASC',
            },
            {
                childSort: navidromePlaylistItemsSort.defaultSort,
                childSortId: `${navidromePlaylists.id}/2`,
            },
            createPlaylistItemsPager
        );
    },
};

const navidromeTracksByGenre: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-genre`,
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    primaryItems: {
        sort: {
            sortOptions: {
                title: 'Title',
                artist: 'Artist',
                album: 'Album',
                albumArtist: 'Album Artist',
            },
            defaultSort: {
                sortBy: 'album',
                sortOrder: 1,
            },
        },
    },

    search(
        genre?: MediaFilter,
        {sortBy, sortOrder} = navidromeTracksByGenre.primaryItems!.sort!.defaultSort
    ): Pager<MediaItem> {
        if (genre) {
            return new NavidromePager(ItemType.Media, 'song', {
                genre_id: genre.id,
                _sort: sortBy,
                _order: sortOrder === -1 ? 'DESC' : 'ASC',
            });
        } else {
            return new SimplePager();
        }
    },
};

const navidromeAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-genre`,
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    primaryItems: {
        sort: {
            sortOptions: {
                name: 'Title',
                albumArtist: 'Artist',
                max_year: 'Year',
            },
            defaultSort: {
                sortBy: 'albumArtist',
                sortOrder: 1,
            },
        },
    },

    search(
        genre?: MediaFilter,
        {sortBy, sortOrder} = navidromeAlbumsByGenre.primaryItems!.sort!.defaultSort
    ): Pager<MediaAlbum> {
        if (genre) {
            return new NavidromePager(ItemType.Album, 'album', {
                genre_id: genre.id,
                _sort: sortBy,
                _order: sortOrder === -1 ? 'DESC' : 'ASC',
            });
        } else {
            return new SimplePager();
        }
    },
};

const navidromeRandomTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/random-tracks`,
    title: 'Random Songs',
    icon: 'shuffle',
    itemType: ItemType.Media,
    primaryItems: {
        layout: {view: 'card'},
    },

    search(): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'song', {_sort: 'random'}, {maxSize: 100});
    },
};

const navidromeRandomAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/random-albums`,
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return new NavidromePager(ItemType.Album, 'album', {_sort: 'random'}, {maxSize: 100});
    },
};

const navidromeRadio: MediaSource<MediaItem> = {
    id: `${serviceId}/radio`,
    title: 'Radio',
    icon: 'radio',
    itemType: ItemType.Media,
    linearType: LinearType.Station,
    defaultHidden: true,
    primaryItems: {
        label: 'Radios',
        layout: radiosLayoutSmall,
        sort: {
            sortOptions: {
                name: 'Name',
                createdAt: 'Date Added',
            },
            defaultSort: {
                sortBy: 'createdAt',
                sortOrder: -1,
            },
        },
    },

    search(
        _,
        {sortBy, sortOrder} = navidromeRadio.primaryItems!.sort!.defaultSort
    ): Pager<MediaItem> {
        return new NavidromePager(ItemType.Media, 'radio', {
            _sort: sortBy,
            _order: sortOrder === -1 ? 'DESC' : 'ASC',
        });
    },
};

const sources: readonly AnyMediaSource[] = [
    navidromeLikedSongs,
    navidromeLikedAlbums,
    navidromeLikedArtists,
    navidromeRecentlyAdded,
    navidromeRecentlyPlayed,
    navidromeMostPlayed,
    navidromeRadio,
    navidromePlaylists,
    navidromeTracksByGenre,
    navidromeAlbumsByGenre,
    navidromeRandomTracks,
    navidromeRandomAlbums,
];

export default sources;

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    const id = `${serviceId}/search/${props.id}`;
    return {
        ...props,
        itemType,
        id,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            q = q.trim();
            switch (itemType) {
                case ItemType.Media:
                    return new NavidromePager(itemType, 'song', {
                        title: q,
                        _sort: 'artist',
                    });

                case ItemType.Album:
                    return new NavidromePager(itemType, 'album', {
                        name: q,
                        _sort: 'album',
                    });

                case ItemType.Artist:
                    return new NavidromePager(
                        itemType,
                        'artist',
                        {
                            name: q,
                            role: q ? 'artist' : 'albumartist',
                            _sort: 'name',
                        },
                        {
                            childSort: navidromeArtistAlbumsSort.defaultSort,
                            childSortId: `${id}/2`,
                        },
                        createArtistAlbumsPager as any
                    );

                case ItemType.Playlist:
                    return new NavidromePager(
                        itemType,
                        'playlist',
                        {q, _sort: 'name'},
                        {
                            childSort: navidromePlaylistItemsSort.defaultSort,
                            childSortId: `${id}/2`,
                        },
                        createPlaylistItemsPager as any
                    );

                default:
                    throw TypeError('Search not supported for this type of media');
            }
        },
    };
}
