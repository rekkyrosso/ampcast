import {Except, SetRequired} from 'type-fest';
import ItemType from 'types/ItemType';
import FilterType from 'types/FilterType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import {shuffle, uniq} from 'utils';
import SimplePager from 'services/pagers/SimplePager';
import {
    albumsLayout,
    artistsLayout,
    defaultMediaItemCard,
    mediaItemsLayout,
    mostPlayedTracksLayout,
} from 'components/MediaList/layouts';
import ibroadcastLibrary from './ibroadcastLibrary';
import IBroadcastPager from './IBroadcastPager';
import IBroadcastSystemItemsPager from './IBroadcastSystemItemsPager';
import {
    createArtistAlbumsPager,
    createPlaylistItemsPager,
    getGenres,
    sortAlbums,
    sortByTitle,
    sortTracks,
} from './ibroadcastUtils';

const serviceId: MediaServiceId = 'ibroadcast';

const ibroadcastTracksLayout: MediaListLayout = addRating(mediaItemsLayout);
const ibroadcastAlbumsLayout: MediaListLayout = addRating(albumsLayout);

const ibroadcastArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        title: 'Title',
        year: 'Year',
    },
    defaultSort: {
        sortBy: 'year',
        sortOrder: -1,
    },
};

export const ibroadcastPlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Genre',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['Name', 'Genre', 'Description', 'TrackCount', 'Progress'],
};

const ibroadcastPlaylistItemsLayout: Partial<MediaListLayout> = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Position', 'Title', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
};

export const ibroadcastPlaylistItemsSort: MediaListSort = {
    sortOptions: {
        position: 'Position',
        title: 'Title',
        artist: 'Artist',
    },
    defaultSort: {
        sortBy: 'position',
        sortOrder: 1,
    },
};

export const ibroadcastPlaylistItems: MediaSourceItems<SetRequired<MediaItem, 'position'>> = {
    layout: ibroadcastPlaylistItemsLayout,
    sort: ibroadcastPlaylistItemsSort,
};

const ibroadcastTracks: MediaSourceItems<MediaItem> = {
    layout: ibroadcastTracksLayout,
};

const ibroadcastAlbums: MediaSourceItems<MediaAlbum> = {
    layout: ibroadcastAlbumsLayout,
};

export const ibroadcastSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {
            id: 'tracks',
            title: 'Tracks',
            primaryItems: {
                layout: {
                    ...ibroadcastTracksLayout,
                    view: 'details',
                },
            },
        }),
        createSearch<MediaAlbum>(ItemType.Album, {
            id: 'albums',
            title: 'Albums',
            primaryItems: ibroadcastAlbums,
        }),
        createSearch<MediaArtist>(ItemType.Artist, {
            id: 'artists',
            title: 'Artists',
            primaryItems: {layout: {view: 'card small'}},
            secondaryItems: {sort: ibroadcastArtistAlbumsSort},
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            primaryItems: {layout: ibroadcastPlaylistLayout},
            secondaryItems: ibroadcastPlaylistItems,
        }),
    ],
};

// const ibroadcastThumbsUp: MediaSource<MediaItem> = {
//     id: `${serviceId}/thumbs-up`,
//     title: 'Thumbs Up',
//     icon: 'thumbs-up',
//     itemType: ItemType.Media,
//     defaultHidden: true,
//     primaryItems: ibroadcastTracks,

//     search(): Pager<MediaItem> {
//         return new IBroadcastSystemItemsPager('thumbsup');
//     },
// };

const ibroadcastTopTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/top-tracks`,
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    defaultHidden: true,
    primaryItems: {
        layout: {
            ...ibroadcastTracksLayout,
            card: {
                ...ibroadcastTracksLayout.card,
                data: 'Rate',
            },
        },
    },

    search(): Pager<MediaItem> {
        return new IBroadcastPager('tracks', () =>
            ibroadcastLibrary.query({
                section: 'tracks',
                filter: (track, map) => !!track[map.rating],
                sort: (a, b, map) =>
                    b[map.rating] === a[map.rating]
                        ? b[map.plays] - a[map.plays]
                        : b[map.rating] - a[map.rating],
            })
        );
    },
};

const ibroadcastTopAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/top-albums`,
    title: 'Top Albums',
    icon: 'star',
    itemType: ItemType.Album,
    defaultHidden: true,
    primaryItems: {
        layout: {
            ...ibroadcastAlbumsLayout,
            card: {
                ...ibroadcastAlbumsLayout.card,
                data: 'Rate',
            },
        },
    },

    search(): Pager<MediaAlbum> {
        return new IBroadcastPager('albums', () =>
            ibroadcastLibrary.query({
                section: 'albums',
                filter: (album, map) => !!album[map.rating],
                sort: (a, b, map) => b[map.rating] - a[map.rating],
            })
        );
    },
};

const ibroadcastTopArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/top-artists`,
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    defaultHidden: true,
    primaryItems: {
        layout: {
            ...addRating(artistsLayout),
            card: {
                ...artistsLayout.card,
                h3: 'Rate',
            },
        },
    },
    secondaryItems: {
        sort: ibroadcastArtistAlbumsSort,
    },

    search(): Pager<MediaArtist> {
        return new IBroadcastPager(
            'artists',
            () =>
                ibroadcastLibrary.query({
                    section: 'artists',
                    filter: (artist, map) => !!artist[map.rating],
                    sort: (a, b, map) => b[map.rating] - a[map.rating],
                }),
            {
                childSort: ibroadcastArtistAlbumsSort.defaultSort,
                childSortId: `${ibroadcastTopArtists.id}/2`,
            },
            createArtistAlbumsPager
        );
    },
};

const ibroadcastRecentlyAdded: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-added`,
    title: 'Recently Added',
    icon: 'recently-added',
    itemType: ItemType.Media,
    primaryItems: ibroadcastTracks,

    search(): Pager<MediaItem> {
        return new IBroadcastSystemItemsPager('recently-uploaded');
    },
};

const ibroadcastRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    primaryItems: ibroadcastTracks,

    search(): Pager<MediaItem> {
        return new IBroadcastSystemItemsPager('recently-played');
    },
};

const ibroadcastMostPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/most-played`,
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    primaryItems: {
        layout: addRating(mostPlayedTracksLayout),
    },

    search(): Pager<MediaItem> {
        return new IBroadcastPager(
            'tracks',
            () =>
                ibroadcastLibrary.query({
                    section: 'tracks',
                    filter: (track, map) => !!track[map.plays],
                    sort: (a, b, map) => b[map.plays] - a[map.plays],
                }),
            undefined,
            undefined,
            () => ibroadcastLibrary.observeSystemPlaylistChanges('recently-played')
        );
    },
};

export const ibroadcastPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: ibroadcastPlaylistLayout,
        sort: {
            sortOptions: {
                title: 'Name',
                '': 'Date Created',
            },
            defaultSort: {
                sortBy: '',
                sortOrder: -1,
            },
        },
    },
    secondaryItems: ibroadcastPlaylistItems,

    search(
        _,
        {sortBy, sortOrder} = ibroadcastPlaylists.primaryItems!.sort!.defaultSort
    ): Pager<MediaPlaylist> {
        return new IBroadcastPager(
            'playlists',
            () =>
                ibroadcastLibrary.query({
                    section: 'playlists',
                    filter: (playlist, map) => !playlist[map.type],
                    sort:
                        sortBy === 'title'
                            ? (a, b, map) => sortByTitle(a[map.name], b[map.name])
                            : undefined,
                    reverse: sortOrder === -1,
                }),
            {
                childSort: ibroadcastPlaylistItemsSort.defaultSort,
                childSortId: `${ibroadcastPlaylists.id}/2`,
            },
            createPlaylistItemsPager,
            () => ibroadcastLibrary.observePlaylistsChanges()
        );
    },
};

const ibroadcastTracksByGenre: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-genre`,
    title: 'Tracks by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    primaryItems: {
        layout: ibroadcastTracksLayout,
        sort: {
            sortOptions: {
                title: 'Title',
                artist: 'Artist',
                album: 'Album',
            },
            defaultSort: {
                sortBy: 'album',
                sortOrder: 1,
            },
        },
    },

    search(
        genre?: MediaFilter,
        {sortBy, sortOrder} = ibroadcastTracksByGenre.primaryItems!.sort!.defaultSort
    ): Pager<MediaItem> {
        if (genre) {
            return new IBroadcastPager('tracks', () =>
                ibroadcastLibrary.query({
                    section: 'tracks',
                    filter: (track, _, library) =>
                        !!getGenres('tracks', track, library)?.includes(genre.id),
                    sort: (a, b, map, library) => sortTracks(sortBy, sortOrder, a, b, map, library),
                })
            );
        } else {
            return new SimplePager();
        }
    },
};

const ibroadcastAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-genre`,
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    primaryItems: {
        layout: ibroadcastAlbumsLayout,
        sort: {
            sortOptions: {
                title: 'Title',
                artist: 'Artist',
                year: 'Year',
            },
            defaultSort: {
                sortBy: 'artist',
                sortOrder: 1,
            },
        },
    },

    search(
        genre?: MediaFilter,
        {sortBy, sortOrder} = ibroadcastAlbumsByGenre.primaryItems!.sort!.defaultSort
    ): Pager<MediaAlbum> {
        if (genre) {
            return new IBroadcastPager('albums', () =>
                ibroadcastLibrary.query({
                    section: 'albums',
                    filter: (album, _, library) =>
                        !!getGenres('albums', album, library)?.includes(genre.id),
                    sort: (a, b, map, library) => sortAlbums(sortBy, sortOrder, a, b, map, library),
                })
            );
        } else {
            return new SimplePager();
        }
    },
};

const ibroadcastTracksByDecade: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-decade`,
    title: 'Tracks by Decade',
    icon: 'calendar',
    itemType: ItemType.Media,
    filterType: FilterType.ByDecade,
    defaultHidden: true,
    primaryItems: {
        layout: ibroadcastTracksLayout,
    },

    search(decade?: MediaFilter): Pager<MediaItem> {
        if (decade) {
            return new IBroadcastPager('tracks', () =>
                ibroadcastLibrary.query({
                    section: 'tracks',
                    filter: (track, map, library) =>
                        filterByDecade(
                            track[map.year] ||
                                library.albums[track[map.album_id]]?.[library.albums.map.year],
                            decade.id
                        ),
                    sort: (a, b, map, library) => sortTracks('year', -1, a, b, map, library),
                })
            );
        } else {
            return new SimplePager();
        }
    },
};

const ibroadcastAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-decade`,
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    filterType: FilterType.ByDecade,
    primaryItems: {
        layout: ibroadcastAlbumsLayout,
    },

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return new IBroadcastPager('albums', () =>
                ibroadcastLibrary.query({
                    section: 'albums',
                    filter: (album, map) => filterByDecade(album[map.year], decade.id),
                    sort: (a, b, map, library) => sortAlbums('year', -1, a, b, map, library),
                })
            );
        } else {
            return new SimplePager();
        }
    },
};

const ibroadcastRandomTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/random-tracks`,
    title: 'Random Tracks',
    icon: 'shuffle',
    itemType: ItemType.Media,
    primaryItems: {
        layout: ibroadcastTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new IBroadcastPager('tracks', async () => {
            const ids = await ibroadcastLibrary.query({section: 'tracks'});
            return shuffle(ids).slice(0, 100);
        });
    },
};

const ibroadcastRandomAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/random-albums`,
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,
    primaryItems: {
        layout: ibroadcastAlbumsLayout,
    },

    search(): Pager<MediaAlbum> {
        return new IBroadcastPager('albums', async () => {
            const ids = await ibroadcastLibrary.query({section: 'albums'});
            return shuffle(ids).slice(0, 100);
        });
    },
};

const ibroadcastSources: readonly AnyMediaSource[] = [
    // ibroadcastThumbsUp,
    ibroadcastTopTracks,
    ibroadcastTopAlbums,
    ibroadcastTopArtists,
    ibroadcastRecentlyAdded,
    ibroadcastRecentlyPlayed,
    ibroadcastMostPlayed,
    ibroadcastPlaylists,
    ibroadcastTracksByDecade,
    ibroadcastAlbumsByDecade,
    ibroadcastTracksByGenre,
    ibroadcastAlbumsByGenre,
    ibroadcastRandomTracks,
    ibroadcastRandomAlbums,
];

export default ibroadcastSources;

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
            switch (itemType) {
                case ItemType.Media:
                    return new IBroadcastPager('tracks', () =>
                        ibroadcastLibrary.search('tracks', q)
                    );

                case ItemType.Album:
                    return new IBroadcastPager('albums', () =>
                        ibroadcastLibrary.search('albums', q)
                    );

                case ItemType.Artist:
                    return new IBroadcastPager(
                        'artists',
                        () => ibroadcastLibrary.search('artists', q),
                        {
                            childSort: ibroadcastArtistAlbumsSort.defaultSort,
                            childSortId: `${id}/2`,
                        },
                        createArtistAlbumsPager as any
                    );

                case ItemType.Playlist:
                    return new IBroadcastPager(
                        'playlists',
                        () => ibroadcastLibrary.search('playlists', q),
                        {
                            childSort: ibroadcastPlaylistItemsSort.defaultSort,
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

function addRating(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        details: uniq(layout.details.concat('Rate')),
    };
}

function filterByDecade(year: number | undefined, decadeId: string): boolean {
    if (!year || year < 1500 || year > 2029) {
        return decadeId === 'other';
    }
    const decade = Number(decadeId);
    if (decade < 1900) {
        return year >= decade && year < decade + 100;
    } else {
        return year >= decade && year < decade + 10;
    }
}
