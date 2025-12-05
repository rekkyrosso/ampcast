import {Except, SetOptional, Writable} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import {uniq} from 'utils';
import {CreateChildPager} from 'services/pagers/MediaPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import plexApi, {getMusicLibraryId, getMusicLibraryPath, getPlexMediaType} from './plexApi';
import plexMediaType from './plexMediaType';
import PlexPager from './PlexPager';
import PlexRecentlyPlayedPager from './PlexRecentlyPlayedPager';
import plexSettings from './plexSettings';
import {createArtistAlbumsPager} from './plexUtils';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';
import {
    albumsLayout,
    artistsLayout,
    mediaItemsLayout,
    mostPlayedTracksLayout,
    playlistItemsLayout,
    radiosLayoutSmall,
    recentlyAddedAlbumsLayout,
    recentlyPlayedTracksLayout,
    topTracksLayout,
} from 'components/MediaList/layouts';

const serviceId: MediaServiceId = 'plex';

const plexTracksLayout: MediaListLayout = addRating(mediaItemsLayout);

const plexTracksSort: MediaListSort = {
    sortOptions: {
        titleSort: 'Title',
        'album.titleSort': 'Album',
        'artist.titleSort': 'Album Artist',
    },
    defaultSort: {
        sortBy: 'artist.titleSort',
        sortOrder: 1,
    },
};

const plexTracks: MediaSourceItems = {
    layout: plexTracksLayout,
    sort: plexTracksSort,
};

const plexAlbumsLayout: MediaListLayout = addRating(albumsLayout);

const plexAlbumsSort: MediaListSort = {
    sortOptions: {
        titleSort: 'Title',
        'artist.titleSort': 'Artist',
        year: 'Year',
    },
    defaultSort: {
        sortBy: 'artist.titleSort',
        sortOrder: 1,
    },
};

const plexAlbums: MediaSourceItems = {
    layout: plexAlbumsLayout,
    sort: plexAlbumsSort,
};

const plexArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        titleSort: 'Title',
        year: 'Year',
    },
    defaultSort: {
        sortBy: 'year',
        sortOrder: -1,
    },
};

const plexPlaylistItems: MediaSourceItems = {
    layout: addRating(playlistItemsLayout),
};

export const plexSearch: MediaMultiSource = {
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
                    ...plexTracksLayout,
                    view: 'details',
                },
            },
        }),
        createSearch<MediaAlbum>(ItemType.Album, {
            id: 'albums',
            title: 'Albums',
            primaryItems: {
                layout: plexAlbumsLayout,
            },
        }),
        createSearch<MediaArtist>(ItemType.Artist, {
            id: 'artists',
            title: 'Artists',
            secondaryItems: {
                sort: plexArtistAlbumsSort,
            },
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            secondaryItems: plexPlaylistItems,
        }),
    ],
};

const plexRadio: MediaSource<MediaItem> = {
    id: `${serviceId}/radio`,
    title: 'Radio',
    icon: 'radio',
    itemType: ItemType.Media,
    filterType: FilterType.ByPlexStationType,
    primaryItems: {
        label: 'Radios',
        layout: radiosLayoutSmall,
    },

    search(type?: MediaFilter): Pager<MediaItem> {
        if (type) {
            if (type.id) {
                return new PlexPager({path: type.id});
            } else {
                return new SimpleMediaPager(
                    async () => (await plexApi.getRadioStations()).defaults
                );
            }
        } else {
            return new SimplePager();
        }
    },
};

const plexRecentlyAdded: MediaSource<MediaAlbum> = {
    id: `${serviceId}/recently-added`,
    title: 'Recently Added',
    icon: 'recently-added',
    itemType: ItemType.Album,
    primaryItems: {
        layout: addRating(recentlyAddedAlbumsLayout),
    },

    search(): Pager<MediaAlbum> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Album,
                'addedAt>>': '-6mon',
                sort: 'addedAt:desc',
            },
        });
    },
};

const plexRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    primaryItems: {
        layout: recentlyPlayedTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new PlexRecentlyPlayedPager();
    },
};

const plexMostPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/most-played`,
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    primaryItems: {
        layout: mostPlayedTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Track,
                'viewCount>': '1',
                sort: 'viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexTopTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/top-tracks`,
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    lockActionsStore: true,
    primaryItems: {
        layout: topTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Track,
                'track.userRating>': '1',
                sort: 'track.userRating:desc,viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexTopAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/top-albums`,
    title: 'Top Albums',
    icon: 'star',
    itemType: ItemType.Album,
    lockActionsStore: true,
    primaryItems: {
        layout: {
            ...plexAlbumsLayout,
            card: {
                ...albumsLayout.card,
                data: 'Rating',
            },
        },
    },

    search(): Pager<MediaAlbum> {
        return new PlexPager({
            path: getMusicLibraryPath(),
            params: {
                type: plexMediaType.Album,
                'album.userRating>': '1',
                sort: 'album.userRating:desc,viewCount:desc,lastViewedAt:desc',
            },
        });
    },
};

const plexTopArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/top-artists`,
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,
    primaryItems: {
        layout: {
            ...addRating(artistsLayout),
            card: {
                ...artistsLayout.card,
                h3: 'Rating',
            },
        },
    },
    secondaryItems: {
        sort: plexArtistAlbumsSort,
    },

    search(): Pager<MediaArtist> {
        return new PlexPager(
            {
                path: getMusicLibraryPath(),
                params: {
                    type: plexMediaType.Artist,
                    'artist.userRating>': '1',
                    sort: 'artist.userRating:desc,viewCount:desc,lastViewedAt:desc',
                },
            },
            {
                childSort: plexArtistAlbumsSort.defaultSort,
                childSortId: `${plexTopArtists.id}/2`,
            },
            undefined,
            createArtistAlbumsPager
        );
    },
};

const plexPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        sort: {
            sortOptions: {
                titleSort: 'Name',
                addedAt: 'Date Added',
                lastViewedAt: 'Last Played',
            },
            defaultSort: {
                sortBy: 'titleSort',
                sortOrder: 1,
            },
        },
    },
    secondaryItems: plexPlaylistItems,

    search(
        _,
        {sortBy, sortOrder} = plexPlaylists.primaryItems!.sort!.defaultSort
    ): Pager<MediaPlaylist> {
        getMusicLibraryId(); // Make sure to throw even if not needed
        return new PlexPager({
            path: '/playlists/all',
            params: {
                type: plexMediaType.Playlist,
                playlistType: 'audio',
                sort: `${sortBy}:${sortOrder === -1 ? 'desc' : 'asc'}`,
            },
        });
    },
};

export const plexEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/editable-playlists`,
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        getMusicLibraryId();
        return new PlexPager({
            path: '/playlists/all',
            params: {
                type: plexMediaType.Playlist,
                playlistType: 'audio',
                readOnly: '0',
                smart: '0',
            },
        });
    },
};

const plexTracksByGenre: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-genre`,
    title: 'Tracks by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    primaryItems: plexTracks,

    search(genre?: MediaFilter, sort?: SortParams): Pager<MediaItem> {
        if (genre) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: genre.id,
                    type: plexMediaType.Track,
                    sort: getTrackSort(sort),
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexTracksByMood: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-mood`,
    title: 'Tracks by Mood',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByMood,
    defaultHidden: true,
    primaryItems: plexTracks,

    search(mood?: MediaFilter, sort?: SortParams): Pager<MediaItem> {
        if (mood) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: mood.id,
                    type: plexMediaType.Track,
                    sort: getTrackSort(sort),
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-genre`,
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    primaryItems: plexAlbums,

    search(genre?: MediaFilter, sort?: SortParams): Pager<MediaAlbum> {
        if (genre) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: genre.id,
                    type: plexMediaType.Album,
                    sort: getAlbumSort(sort),
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexAlbumsByMood: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-mood`,
    title: 'Albums by Mood',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByMood,
    defaultHidden: true,
    primaryItems: plexAlbums,

    search(mood?: MediaFilter, sort?: SortParams): Pager<MediaAlbum> {
        if (mood) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: mood.id,
                    type: plexMediaType.Album,
                    sort: getAlbumSort(sort),
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexAlbumsByStyle: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-style`,
    title: 'Albums by Style',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByStyle,
    defaultHidden: true,
    primaryItems: plexAlbums,

    search(style?: MediaFilter, sort?: SortParams): Pager<MediaAlbum> {
        if (style) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    genre: style.id,
                    type: plexMediaType.Album,
                    sort: getAlbumSort(sort),
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexArtistsByCountry: MediaSource<MediaArtist> = {
    id: `${serviceId}/artists-by-country`,
    title: 'Artists by Country',
    icon: 'country',
    itemType: ItemType.Artist,
    filterType: FilterType.ByCountry,
    defaultHidden: true,
    secondaryItems: {
        sort: plexArtistAlbumsSort,
    },

    search(country?: MediaFilter): Pager<MediaArtist> {
        if (country) {
            return new PlexPager(
                {
                    path: getMusicLibraryPath(),
                    params: {
                        genre: country.id,
                        type: plexMediaType.Artist,
                    },
                },
                {
                    childSort: plexArtistAlbumsSort.defaultSort,
                    childSortId: `${plexArtistsByCountry.id}/2`,
                },
                undefined,
                createArtistAlbumsPager
            );
        } else {
            return new SimplePager();
        }
    },
};

const plexArtistsByGenre: MediaSource<MediaArtist> = {
    id: `${serviceId}/artists-by-genre`,
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    secondaryItems: {
        sort: plexArtistAlbumsSort,
    },

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new PlexPager(
                {
                    path: getMusicLibraryPath(),
                    params: {
                        genre: genre.id,
                        type: plexMediaType.Artist,
                    },
                },
                {
                    childSort: plexArtistAlbumsSort.defaultSort,
                    childSortId: `${plexArtistsByGenre.id}/2`,
                },
                undefined,
                createArtistAlbumsPager
            );
        } else {
            return new SimplePager();
        }
    },
};

const plexAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-decade`,
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    filterType: FilterType.ByDecade,
    primaryItems: {
        layout: plexAlbumsLayout,
    },

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return new PlexPager({
                path: getMusicLibraryPath(),
                params: {
                    decade: decade.id,
                    type: plexMediaType.Album,
                    sort: 'year:desc,originallyAvailableAt:desc',
                },
            });
        } else {
            return new SimplePager();
        }
    },
};

const plexRandomTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/random-tracks`,
    title: 'Random Tracks',
    icon: 'shuffle',
    itemType: ItemType.Media,
    primaryItems: {
        layout: plexTracksLayout,
    },

    search(): Pager<MediaItem> {
        return new PlexPager(
            {
                path: getMusicLibraryPath(),
                params: {type: plexMediaType.Track, sort: 'random'},
            },
            {maxSize: 100}
        );
    },
};

const plexRandomAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/random-albums`,
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,
    primaryItems: {
        layout: plexAlbumsLayout,
    },

    search(): Pager<MediaAlbum> {
        return new PlexPager(
            {
                path: getMusicLibraryPath(),
                params: {type: plexMediaType.Album, sort: 'random'},
            },
            {maxSize: 100}
        );
    },
};

const plexMusicVideos: MediaSource<MediaItem> = {
    id: `${serviceId}/videos`,
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    searchable: true,
    defaultHidden: true,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        return new PlexPager({
            path: getMusicLibraryPath('extras/all'),
            params: {
                title: q,
                type: plexMediaType.Artist,
                extraType: plexMediaType.Episode,
            },
        });
    },
};

const plexFolders: MediaSource<MediaFolderItem> = {
    id: `${serviceId}/folders`,
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    Component: FolderBrowser,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: 'plex:folder:',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new SimpleMediaPager<MediaFolderItem>(async () =>
            plexSettings.libraries.map(({id, title}) => {
                const section: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `plex:folder:/library/sections/${id}/folder`,
                    title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager([parentFolder]);
                const folderPager = new PlexPager<MediaFolderItem>(
                    {
                        path: `library/sections/${id}/folder`,
                        params: {includeCollections: '1'},
                    },
                    undefined,
                    section as MediaFolder
                );

                section.pager = new WrappedPager<MediaFolderItem>(backPager, folderPager);

                return section as MediaFolder;
            })
        );

        return root.pager;
    },
};

const plexSources = [
    plexTopTracks,
    plexTopAlbums,
    plexTopArtists,
    plexMostPlayed,
    plexRecentlyAdded,
    plexRecentlyPlayed,
    plexRadio,
    plexPlaylists,
    plexTracksByGenre,
    plexTracksByMood,
    plexAlbumsByGenre,
    plexAlbumsByMood,
    plexAlbumsByStyle,
    plexAlbumsByDecade,
    plexArtistsByGenre,
    plexArtistsByCountry,
    plexRandomTracks,
    plexRandomAlbums,
    plexMusicVideos,
    plexFolders,
];

export default plexSources;

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    const id = `${serviceId}/search/${props.id}`;
    return {
        ...props,
        id,
        itemType,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(
                itemType,
                q,
                itemType === ItemType.Artist
                    ? {
                          childSort: plexArtistAlbumsSort.defaultSort,
                          childSortId: `${id}/2`,
                      }
                    : undefined,
                itemType === ItemType.Artist ? (createArtistAlbumsPager as any) : undefined
            );
        },
    };
}

export function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    options?: Partial<PagerConfig<T>>,
    createChildPager?: CreateChildPager<T>
): Pager<T> {
    getMusicLibraryId(); // Make sure to throw even if not needed
    const path = itemType === ItemType.Playlist ? '/playlists/all' : getMusicLibraryPath();
    const params: Record<string, string> = {};
    if (q) {
        params.title = q.trim();
    }
    params.type = getPlexMediaType(itemType);
    if (itemType === ItemType.Playlist) {
        params.playlistType = 'audio';
    }
    return new PlexPager<T>({path, params}, options, undefined, createChildPager);
}

function addRating(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        details: uniq(layout.details.concat('Rating')),
    };
}

function getAlbumSort({sortBy, sortOrder} = plexAlbumsSort.defaultSort) {
    return `${sortBy}:${sortOrder === -1 ? 'desc' : 'asc'}${
        sortBy === 'artist.titleSort'
            ? ',album.titleSort,album.index,album.id,album.originallyAvailableAt'
            : ''
    }`;
}

function getTrackSort({sortBy, sortOrder} = plexAlbumsSort.defaultSort) {
    return `${sortBy}:${sortOrder === -1 ? 'desc' : 'asc'}${
        sortBy === 'artist.titleSort'
            ? ',album.titleSort,album.year,track.absoluteIndex,track.index,track.titleSort,track.id'
            : ''
    }`;
}
