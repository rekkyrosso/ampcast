import {Except, SetOptional, Writable} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFilter from 'types/MediaFilter';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import {NoMusicLibraryError, NoMusicVideoLibraryError} from 'services/errors';
import {CreateChildPager} from 'services/pagers/AbstractPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import EmbyPager from './EmbyPager';
import embySettings from './embySettings';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';
import {
    mostPlayedTracksLayout,
    recentlyAddedAlbumsLayout,
    recentlyPlayedTracksLayout,
} from 'components/MediaList/layouts';
import {createArtistAlbumsPager, createPlaylistItemsPager, getSort} from './embyUtils';

const serviceId: MediaServiceId = 'emby';

const embyTracksSort: MediaListSort = {
    sortOptions: {
        SortName: 'Title',
        'Artist,Album,ParentIndexNumber,IndexNumber,SortName': 'Artist',
        'Album,ParentIndexNumber,IndexNumber': 'Album',
        'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName': 'Album Artist',
    },
    defaultSort: {
        sortBy: 'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName',
        sortOrder: 1,
    },
};

const embyAlbumsSort: MediaListSort = {
    sortOptions: {
        SortName: 'Title',
        'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName': 'Artist',
        'ProductionYear,PremiereDate,SortName': 'Year',
    },
    defaultSort: {
        sortBy: 'AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName',
        sortOrder: 1,
    },
};

const embyArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        SortName: 'Title',
        'ProductionYear,PremiereDate,SortName': 'Year',
    },
    defaultSort: {
        sortBy: 'ProductionYear,PremiereDate,SortName',
        sortOrder: -1,
    },
};

const embyPlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Genre',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['Name', 'Genre', 'TrackCount', 'Progress'],
};

export const embyPlaylistItemsSort: MediaListSort = {
    sortOptions: {
        ListItemOrder: 'Position',
        SortName: 'Title',
        'Artist,Album,ParentIndexNumber,IndexNumber,SortName': 'Artist',
    },
    defaultSort: {
        sortBy: 'ListItemOrder',
        sortOrder: 1,
    },
};

export const embySearch: MediaMultiSource = {
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
            secondaryItems: {sort: embyArtistAlbumsSort},
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            primaryItems: {layout: embyPlaylistLayout},
            secondaryItems: {sort: embyPlaylistItemsSort},
        }),
    ],
};

const embyLikedSongs: MediaSource<MediaItem> = {
    id: `${serviceId}/liked-songs`,
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    primaryItems: {sort: embyTracksSort},

    search(_, sort = embyTracksSort.defaultSort): Pager<MediaItem> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsFavorite',
            ...getSort(sort),
        });
    },
};

const embyLikedAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/liked-albums`,
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,
    primaryItems: {
        sort: embyAlbumsSort,
    },

    search(_, sort = embyAlbumsSort.defaultSort): Pager<MediaAlbum> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsFavorite',
            IncludeItemTypes: 'MusicAlbum',
            ...getSort(sort),
        });
    },
};

const embyLikedArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/liked-artists`,
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,
    secondaryItems: {sort: embyArtistAlbumsSort},

    search(): Pager<MediaArtist> {
        return new EmbyPager(
            'Artists/AlbumArtists',
            {
                ParentId: getMusicLibraryId(),
                isFavorite: true,
                UserId: embySettings.userId,
            },
            {
                childSort: embyArtistAlbumsSort.defaultSort,
                childSortId: `${embyLikedArtists.id}/2`,
            },
            undefined,
            createArtistAlbumsPager
        );
    },
};

const embyRecentlyAdded: MediaSource<MediaAlbum> = {
    id: `${serviceId}/recently-added`,
    title: 'Recently Added',
    icon: 'recently-added',
    itemType: ItemType.Album,
    primaryItems: {
        layout: recentlyAddedAlbumsLayout,
    },

    search(): Pager<MediaAlbum> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            SortBy: 'DateCreated,SortName',
            SortOrder: 'Descending,Ascending',
            IncludeItemTypes: 'MusicAlbum',
        });
    },
};

const embyRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    primaryItems: {
        layout: recentlyPlayedTracksLayout,
    },

    search(): Pager<MediaItem> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            SortBy: 'DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const embyMostPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/most-played`,
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    primaryItems: {
        layout: mostPlayedTracksLayout,
    },

    search(): Pager<MediaItem> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsPlayed',
            SortBy: 'PlayCount,DatePlayed',
            SortOrder: 'Descending',
        });
    },
};

const embyPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: embyPlaylistLayout,
        sort: {
            sortOptions: {
                SortName: 'Name',
                'DateCreated,SortName': 'Date Created',
            },
            defaultSort: {
                sortBy: 'SortName',
                sortOrder: 1,
            },
        },
    },
    secondaryItems: {
        sort: embyPlaylistItemsSort,
    },

    search(_, sort = embyPlaylists.primaryItems!.sort!.defaultSort): Pager<MediaPlaylist> {
        return createItemsPager(
            {
                ParentId: getMusicLibraryId(),
                IncludeItemTypes: 'Playlist',
                ...getSort(sort),
            },
            {
                childSort: embyPlaylistItemsSort.defaultSort,
                childSortId: `${embyPlaylists.id}/2`,
            },
            createPlaylistItemsPager
        );
    },
};

export const embyEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/editable-playlists`,
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            IncludeItemTypes: 'Playlist',
            CanEditItems: 'true',
            EnableUserData: 'false',
        });
    },
};

const embyTracksByGenre: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-genre`,
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    primaryItems: {sort: embyTracksSort},

    search(genre?: MediaFilter, sort = embyTracksSort.defaultSort): Pager<MediaItem> {
        if (genre) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                GenreIds: genre.id,
                IncludeItemTypes: 'Audio',
                ...getSort(sort),
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-genre`,
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    primaryItems: {sort: embyAlbumsSort},

    search(genre?: MediaFilter, sort = embyAlbumsSort.defaultSort): Pager<MediaAlbum> {
        if (genre) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                GenreIds: genre.id,
                IncludeItemTypes: 'MusicAlbum',
                ...getSort(sort),
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyArtistsByGenre: MediaSource<MediaArtist> = {
    id: `${serviceId}/artists-by-genre`,
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    secondaryItems: {sort: embyArtistAlbumsSort},

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new EmbyPager(
                'Artists/AlbumArtists',
                {
                    ParentId: getMusicLibraryId(),
                    GenreIds: genre.id,
                    UserId: embySettings.userId,
                },
                {
                    childSort: embyArtistAlbumsSort.defaultSort,
                    childSortId: `${embyArtistsByGenre.id}/2`,
                },
                undefined,
                createArtistAlbumsPager
            );
        } else {
            return new SimplePager();
        }
    },
};

const embyTracksByDecade: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-decade`,
    title: 'Songs by Decade',
    icon: 'calendar',
    itemType: ItemType.Media,
    filterType: FilterType.ByDecade,
    defaultHidden: true,

    search(decade?: MediaFilter): Pager<MediaItem> {
        if (decade) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Years: decade.id,
                IncludeItemTypes: 'Audio',
                SortBy: 'ProductionYear,PremiereDate,AlbumArtist,Album,ParentIndexNumber,IndexNumber,SortName',
                SortOrder:
                    'Descending,Descending,Ascending,Ascending,Ascending,Ascending,Ascending',
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyAlbumsByDecade: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-decade`,
    title: 'Albums by Decade',
    icon: 'calendar',
    itemType: ItemType.Album,
    filterType: FilterType.ByDecade,

    search(decade?: MediaFilter): Pager<MediaAlbum> {
        if (decade) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Years: decade.id,
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'ProductionYear,AlbumArtist,PremiereDate,SortName',
                SortOrder: 'Descending,Ascending,Descending,Ascending',
            });
        } else {
            return new SimplePager();
        }
    },
};

const embyRandomTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/random-tracks`,
    title: 'Random Songs',
    icon: 'shuffle',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return createItemsPager(
            {
                ParentId: getMusicLibraryId(),
                IncludeItemTypes: 'Audio',
                SortBy: 'Random',
            },
            {maxSize: 100}
        );
    },
};

const embyRandomAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/random-albums`,
    title: 'Random Albums',
    icon: 'shuffle',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return createItemsPager(
            {
                ParentId: getMusicLibraryId(),
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'Random',
            },
            {maxSize: 100}
        );
    },
};

const embyMusicVideos: MediaSource<MediaItem> = {
    id: `${serviceId}/videos`,
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    searchable: true,
    defaultHidden: true,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        const videoLibraryId = embySettings.videoLibraryId;
        if (!videoLibraryId) {
            throw new NoMusicVideoLibraryError();
        }
        return createItemsPager({
            ParentId: videoLibraryId,
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IncludeItemTypes: 'MusicVideo',
            SearchTerm: q,
        });
    },
};

const embyFolders: MediaSource<MediaFolderItem> = {
    id: `${serviceId}/folders`,
    title: 'Folders',
    icon: 'folder',
    itemType: ItemType.Folder,
    Component: FolderBrowser,

    search(): Pager<MediaFolderItem> {
        const root: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: '',
            title: 'Folders',
            fileName: '',
            path: '',
        };

        root.pager = new SimpleMediaPager<MediaFolderItem>(async () =>
            embySettings.libraries.map(({id, title}) => {
                const library: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `emby:folder:${id}`,
                    title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager([parentFolder]);
                const folderPager = new EmbyPager<MediaFolderItem>(
                    `Users/${embySettings.userId}/Items`,
                    {
                        ParentId: id,
                        IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio,MusicVideo',
                        Fields: 'AudioInfo,Genres,UserData,ParentId,Path,PresentationUniqueKey',
                        EnableUserData: true,
                        Recursive: false,
                        SortBy: 'IsFolder,IndexNumber,FileName',
                        SortOrder: 'Ascending',
                    },
                    undefined,
                    library as MediaFolder
                );

                library.pager = new WrappedPager<MediaFolderItem>(backPager, folderPager);

                return library as MediaFolder;
            })
        );

        return root.pager;
    },
};

const embySources: readonly AnyMediaSource[] = [
    embyLikedSongs,
    embyLikedAlbums,
    embyLikedArtists,
    embyMostPlayed,
    embyRecentlyAdded,
    embyRecentlyPlayed,
    embyPlaylists,
    embyTracksByGenre,
    embyAlbumsByGenre,
    embyArtistsByGenre,
    embyTracksByDecade,
    embyAlbumsByDecade,
    embyRandomTracks,
    embyRandomAlbums,
    embyMusicVideos,
    embyFolders,
];

export default embySources;

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    const id = `${serviceId}/search/${props.id}`;
    let options: Partial<PagerConfig> | undefined;
    let createChildPager: CreateChildPager<T> | undefined;
    switch (itemType) {
        case ItemType.Artist:
            options = {
                childSort: embyArtistAlbumsSort.defaultSort,
                childSortId: `${id}/2`,
            };
            createChildPager = createArtistAlbumsPager as any;
            break;

        case ItemType.Playlist:
            options = {
                childSort: embyPlaylistItemsSort.defaultSort,
                childSortId: `${id}/2`,
            };
            createChildPager = createPlaylistItemsPager as any;
            break;
    }
    return {
        ...props,
        id,
        itemType,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q, undefined, options, createChildPager);
        },
    };
}

export function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    filters?: Record<string, string>,
    options?: Partial<PagerConfig>,
    createChildPager?: CreateChildPager<T>
): Pager<T> {
    const params: Record<string, string> = {
        ParentId: getMusicLibraryId(),
        SearchTerm: q.trim(),
        ...filters,
    };
    switch (itemType) {
        case ItemType.Media:
            params.IncludeItemTypes = 'Audio';
            break;

        case ItemType.Album:
            params.IncludeItemTypes = 'MusicAlbum';
            break;

        case ItemType.Artist:
            params.IncludeItemTypes = 'MusicArtist';
            params.SortBy = 'SortName';
            break;

        case ItemType.Playlist:
            params.IncludeItemTypes = 'Playlist';
            params.SortBy = 'SortName';
            break;
    }
    return createItemsPager(params, options, createChildPager);
}

export function createItemsPager<T extends MediaObject>(
    params: Record<string, string>,
    options?: Partial<PagerConfig>,
    createChildPager?: CreateChildPager<T>
): Pager<T> {
    return new EmbyPager(
        `Users/${embySettings.userId}/Items`,
        params,
        options,
        undefined,
        createChildPager
    );
}

function getMusicLibraryId(): string {
    const libraryId = embySettings.libraryId;
    if (!libraryId) {
        throw new NoMusicLibraryError();
    }
    return libraryId;
}
