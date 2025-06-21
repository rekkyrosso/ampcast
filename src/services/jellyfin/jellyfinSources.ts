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
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import JellyfinPager from './JellyfinPager';
import jellyfinSettings from './jellyfinSettings';
import FolderBrowser from 'components/MediaBrowser/FolderBrowser';
import {
    mostPlayedTracksLayout,
    recentlyAddedAlbumsLayout,
    recentlyPlayedTracksLayout,
} from 'components/MediaList/layouts';
import {createArtistAlbumsPager, createPlaylistItemsPager, getSort} from './jellyfinUtils';
import {CreateChildPager} from 'services/pagers/AbstractPager';

const serviceId: MediaServiceId = 'jellyfin';

const jellyfinTracksSort: MediaListSort = {
    sortOptions: {
        Name: 'Title',
        'Artist,Album,SortName': 'Artist',
        'Album,SortName': 'Album',
        'AlbumArtist,Album,SortName': 'Album Artist',
    },
    defaultSort: {
        sortBy: 'AlbumArtist,Album,SortName',
        sortOrder: 1,
    },
};

const jellyfinAlbumsSort: MediaListSort = {
    sortOptions: {
        SortName: 'Title',
        'AlbumArtist,SortName': 'Artist',
        'ProductionYear,PremiereDate,AlbumArtist,Album,SortName': 'Year',
    },
    defaultSort: {
        sortBy: 'AlbumArtist,SortName',
        sortOrder: 1,
    },
};

const jellyfinArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        SortName: 'Title',
        'ProductionYear,PremiereDate,SortName': 'Year',
    },
    defaultSort: {
        sortBy: 'ProductionYear,PremiereDate,SortName',
        sortOrder: -1,
    },
};

const jellyfinPlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Genre',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['Name', 'Genre', 'TrackCount', 'Progress'],
};

export const jellyfinPlaylistItemsSort: MediaListSort = {
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

export const jellyfinSearch: MediaMultiSource = {
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
            secondaryItems: {sort: jellyfinArtistAlbumsSort},
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            primaryItems: {layout: jellyfinPlaylistLayout},
            secondaryItems: {sort: jellyfinPlaylistItemsSort},
        }),
    ],
};

const jellyfinLikedSongs: MediaSource<MediaItem> = {
    id: `${serviceId}/liked-songs`,
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    primaryItems: {sort: jellyfinTracksSort},

    search(_, sort = jellyfinTracksSort.defaultSort): Pager<MediaItem> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsFavorite',
            ...getSort(sort),
        });
    },
};

const jellyfinLikedAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/liked-albums`,
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,
    primaryItems: {
        sort: jellyfinAlbumsSort,
    },

    search(_, sort = jellyfinAlbumsSort.defaultSort): Pager<MediaAlbum> {
        return createItemsPager({
            ParentId: getMusicLibraryId(),
            Filters: 'IsFavorite',
            IncludeItemTypes: 'MusicAlbum',
            ...getSort(sort),
        });
    },
};

const jellyfinLikedArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/liked-artists`,
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,
    secondaryItems: {sort: jellyfinArtistAlbumsSort},

    search(): Pager<MediaArtist> {
        return new JellyfinPager(
            'Artists/AlbumArtists',
            {
                ParentId: getMusicLibraryId(),
                isFavorite: true,
                UserId: jellyfinSettings.userId,
            },
            {
                childSort: jellyfinArtistAlbumsSort.defaultSort,
                childSortId: `${jellyfinLikedArtists.id}/2`,
            },
            undefined,
            createArtistAlbumsPager
        );
    },
};

const jellyfinRecentlyAdded: MediaSource<MediaAlbum> = {
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
            IncludeItemTypes: 'MusicAlbum',
            SortBy: 'DateCreated,SortName',
            SortOrder: 'Descending,Ascending',
        });
    },
};

const jellyfinRecentlyPlayed: MediaSource<MediaItem> = {
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

const jellyfinMostPlayed: MediaSource<MediaItem> = {
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
            SortBy: 'PlayCount,DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const jellyfinPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: jellyfinPlaylistLayout,
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
        sort: jellyfinPlaylistItemsSort,
    },

    search(_, sort = jellyfinPlaylists.primaryItems!.sort!.defaultSort): Pager<MediaPlaylist> {
        return createItemsPager(
            {
                IncludeItemTypes: 'Playlist',
                ...getSort(sort),
            },
            {
                childSort: jellyfinPlaylistItemsSort.defaultSort,
                childSortId: `${jellyfinPlaylists.id}/2`,
            },
            createPlaylistItemsPager
        );
    },
};

export const jellyfinEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/editable-playlists`,
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return createItemsPager({
            IncludeItemTypes: 'Playlist',
        });
    },
};

const jellyfinTracksByGenre: MediaSource<MediaItem> = {
    id: `${serviceId}/tracks-by-genre`,
    title: 'Songs by Genre',
    icon: 'genre',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    primaryItems: {sort: jellyfinTracksSort},

    search(genre?: MediaFilter, sort = jellyfinTracksSort.defaultSort): Pager<MediaItem> {
        if (genre) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                Genres: genre.id,
                IncludeItemTypes: 'Audio',
                ...getSort(sort),
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinAlbumsByGenre: MediaSource<MediaAlbum> = {
    id: `${serviceId}/albums-by-genre`,
    title: 'Albums by Genre',
    icon: 'genre',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    primaryItems: {sort: jellyfinAlbumsSort},

    search(genre?: MediaFilter, sort = jellyfinAlbumsSort.defaultSort): Pager<MediaAlbum> {
        if (genre) {
            return createItemsPager({
                ParentId: getMusicLibraryId(),
                IncludeItemTypes: 'MusicAlbum',
                Genres: genre.id,
                ...getSort(sort),
            });
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinArtistsByGenre: MediaSource<MediaArtist> = {
    id: `${serviceId}/artists-by-genre`,
    title: 'Artists by Genre',
    icon: 'genre',
    itemType: ItemType.Artist,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    secondaryItems: {sort: jellyfinArtistAlbumsSort},

    search(genre?: MediaFilter): Pager<MediaArtist> {
        if (genre) {
            return new JellyfinPager(
                'Artists/AlbumArtists',
                {
                    ParentId: getMusicLibraryId(),
                    Genres: genre.id,
                    UserId: jellyfinSettings.userId,
                },
                {
                    childSort: jellyfinArtistAlbumsSort.defaultSort,
                    childSortId: `${jellyfinArtistsByGenre.id}/2`,
                },
                undefined,
                createArtistAlbumsPager
            );
        } else {
            return new SimplePager();
        }
    },
};

const jellyfinTracksByDecade: MediaSource<MediaItem> = {
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

const jellyfinAlbumsByDecade: MediaSource<MediaAlbum> = {
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

const jellyfinRandomTracks: MediaSource<MediaItem> = {
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

const jellyfinRandomAlbums: MediaSource<MediaAlbum> = {
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

const jellyfinMusicVideos: MediaSource<MediaItem> = {
    id: `${serviceId}/videos`,
    title: 'Music Videos',
    icon: 'video',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    searchable: true,
    defaultHidden: true,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        const videoLibraryId = jellyfinSettings.videoLibraryId;
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

const jellyfinFolders: MediaSource<MediaFolderItem> = {
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
            jellyfinSettings.libraries.map(({id, title}) => {
                const library: Writable<SetOptional<MediaFolder, 'pager'>> = {
                    itemType: ItemType.Folder,
                    src: `jellyfin:folder:${id}`,
                    title,
                    fileName: title,
                    path: `/${title}`,
                };
                const parentFolder: MediaFolderItem = {
                    ...(root as MediaFolder),
                    fileName: '../',
                };
                const backPager = new SimplePager([parentFolder]);
                const folderPager = new JellyfinPager<MediaFolderItem>(
                    `Users/${jellyfinSettings.userId}/Items`,
                    {
                        ParentId: id,
                        IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio,MusicVideo',
                        Fields: 'AudioInfo,Genres,UserData,ParentId,Path',
                        EnableUserData: true,
                        Recursive: false,
                        SortBy: 'IsFolder,IndexNumber,SortName',
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

const jellyfinSources: readonly AnyMediaSource[] = [
    jellyfinLikedSongs,
    jellyfinLikedAlbums,
    jellyfinLikedArtists,
    jellyfinMostPlayed,
    jellyfinRecentlyAdded,
    jellyfinRecentlyPlayed,
    jellyfinPlaylists,
    jellyfinTracksByGenre,
    jellyfinAlbumsByGenre,
    jellyfinArtistsByGenre,
    jellyfinTracksByDecade,
    jellyfinAlbumsByDecade,
    jellyfinRandomTracks,
    jellyfinRandomAlbums,
    jellyfinMusicVideos,
    jellyfinFolders,
];

export default jellyfinSources;

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
                childSort: jellyfinArtistAlbumsSort.defaultSort,
                childSortId: `${id}/2`,
            };
            createChildPager = createArtistAlbumsPager as any;
            break;

        case ItemType.Playlist:
            options = {
                childSort: jellyfinPlaylistItemsSort.defaultSort,
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
        SortBy: 'SortName',
        SearchTerm: q.trim(),
        ...filters,
    };
    if (itemType === ItemType.Artist) {
        return new JellyfinPager(
            'Artists',
            {...params, ParentId: getMusicLibraryId(), UserId: jellyfinSettings.userId},
            options
        );
    } else {
        switch (itemType) {
            case ItemType.Media:
                params.ParentId = getMusicLibraryId();
                params.IncludeItemTypes = 'Audio';
                params.SortBy = 'AlbumArtist,Album,SortName';
                break;

            case ItemType.Album:
                params.ParentId = getMusicLibraryId();
                params.IncludeItemTypes = 'MusicAlbum';
                params.SortBy = 'AlbumArtist,SortName';
                break;

            case ItemType.Playlist:
                params.IncludeItemTypes = 'Playlist';
                break;
        }
        return createItemsPager(params, options, createChildPager);
    }
}

export function createItemsPager<T extends MediaObject>(
    params: Record<string, string>,
    options?: Partial<PagerConfig>,
    createChildPager?: CreateChildPager<T>
): Pager<T> {
    return new JellyfinPager(
        `Users/${jellyfinSettings.userId}/Items`,
        params,
        options,
        undefined,
        createChildPager
    );
}

function getMusicLibraryId(): string {
    const libraryId = jellyfinSettings.libraryId;
    if (!libraryId) {
        throw new NoMusicLibraryError();
    }
    return libraryId;
}
