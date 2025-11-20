import {Except} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFilter from 'types/MediaFilter';
import MediaListLayout from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import Pager, {PagerConfig} from 'types/Pager';
import {exists, partition} from 'utils';
import {NoSpotifyChartsError} from 'services/errors';
import SimplePager from 'services/pagers/SimplePager';
import {setHiddenSources} from 'services/mediaServices/servicesSettings';
import {
    albumsLayout,
    mediaItemsLayout,
    playlistItemsLayout,
    recentlyPlayedTracksLayout,
    songChartsLayout,
} from 'components/MediaList/layouts';
import spotifyApi, {SpotifyAlbum, SpotifyArtist, SpotifyPlaylist} from './spotifyApi';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';
import spotifySettings from './spotifySettings';
import {getMarket} from './spotifyUtils';
import SpotifyRecentlyPlayedBrowser from './components/SpotifyRecentlyPlayedBrowser';

const serviceId: MediaServiceId = 'spotify';

const isRestrictedApi = spotifySettings.restrictedApi;

const spotifyMediaItems: MediaSourceItems = {
    layout: removeGenre(mediaItemsLayout),
};

const spotifyPlaylistItems: MediaSourceItems = {
    layout: removeGenre(playlistItemsLayout),
};

export const spotifySearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {
            id: 'songs',
            title: 'Songs',
            primaryItems: spotifyMediaItems,
        }),
        createSearch<MediaAlbum>(ItemType.Album, {
            id: 'albums',
            title: 'Albums',
        }),
        createSearch<MediaArtist>(ItemType.Artist, {
            id: 'artists',
            title: 'Artists',
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            secondaryItems: spotifyPlaylistItems,
        }),
    ],
};

const spotifyRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    primaryItems: {
        itemKey: 'playedAt',
        layout: removeGenre(recentlyPlayedTracksLayout),
    },
    Component: SpotifyRecentlyPlayedBrowser,

    search(): Pager<MediaItem> {
        // This doesn't get called (intercepted by `SpotifyRecentlyPlayedBrowser`).
        return new SimplePager();
    },
};

// TODO: Spotify scope: 'user-top-read'.

// const spotifyTopTracks: MediaSource<MediaItem> = {
//     id: `${serviceId}/top-tracks`,
//     title: 'Top Tracks',
//     icon: 'star',
//     itemType: ItemType.Media,
//     primaryItems: spotifyMediaItems,
//
//     search(): Pager<MediaItem> {
//         return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
//             return spotifyApi.getMyTopTracks({offset, limit});
//         });
//     },
// };
//
// const spotifyTopArtists: MediaSource<MediaArtist> = {
//     id: `${serviceId}/top-artists`,
//     title: 'Top Artists',
//     icon: 'star',
//     itemType: ItemType.Artist,
//     defaultHidden: true,
//
//     search(): Pager<MediaArtist> {
//         return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
//             return spotifyApi.getMyTopArtists({offset, limit});
//         });
//     },
// };

const spotifyLikedSongs: MediaSource<MediaItem> = {
    id: `${serviceId}/liked-songs`,
    title: 'My Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    primaryItems: spotifyMediaItems,

    search(): Pager<MediaItem> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getMySavedTracks({
                    offset,
                    limit,
                    market,
                });
                return {items: items.filter(exists).map((item) => item.track), total, next};
            },
            undefined,
            true
        );
    },
};

const spotifyLikedAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/liked-albums`,
    title: 'My Albums',
    icon: 'heart',
    itemType: ItemType.Album,
    lockActionsStore: true,

    search(): Pager<MediaAlbum> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getMySavedAlbums({
                    offset,
                    limit,
                    market,
                });
                return {items: items.filter(exists).map((item) => item.album), total, next};
            },
            {pageSize: 20},
            true
        );
    },
};

const spotifyFollowedArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/followed-artists`,
    title: 'My Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    lockActionsStore: true,

    search(): Pager<MediaArtist> {
        return new SpotifyPager(
            async (_, limit: number, after: string): Promise<SpotifyPage> => {
                const options: Record<string, number | string> = {
                    type: 'artist',
                    limit,
                };
                if (after) {
                    options.after = after;
                }
                const {
                    artists: {items, total, cursors},
                } = await spotifyApi.getFollowedArtists(options);
                return {items, total, next: cursors?.after};
            },
            undefined,
            true
        );
    },
};

const spotifyPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'My Playlists',
    icon: 'heart',
    itemType: ItemType.Playlist,
    lockActionsStore: true,
    secondaryItems: spotifyPlaylistItems,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getUserPlaylists(
                    spotifySettings.userId,
                    {offset, limit, market}
                );
                return {items: items as SpotifyPlaylist[], total, next};
            },
            undefined,
            true
        );
    },
};

export const spotifyEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/editable-playlists`,
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        const userId = spotifySettings.userId;
        let nonEditableTotal = 0;
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getUserPlaylists(userId, {
                    offset,
                    limit,
                    market,
                });
                const [editable, nonEditable] = partition(
                    items,
                    (item) => item?.owner.id === userId
                );
                nonEditableTotal += nonEditable.length;
                return {
                    items: editable as SpotifyPlaylist[],
                    total: total - nonEditableTotal,
                    next,
                };
            },
            undefined,
            true
        );
    },
};

const spotifyFeaturedPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/featured-playlists`,
    title: 'Popular Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    disabled: isRestrictedApi,
    secondaryItems: spotifyPlaylistItems,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {
                playlists: {items, total, next},
            } = await spotifyApi.getFeaturedPlaylists({
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyPlaylist[], total, next};
        });
    },
};

const spotifyNewReleases: MediaSource<MediaAlbum> = {
    id: `${serviceId}/new-albums`,
    title: 'New Releases',
    icon: 'album',
    itemType: ItemType.Album,
    defaultHidden: true,
    primaryItems: {
        layout: {
            ...albumsLayout,
            card: {
                ...albumsLayout.card,
                data: 'Released',
            },
            details: albumsLayout.details.concat('Released'),
        },
    },

    search(): Pager<MediaAlbum> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {
                albums: {items, total, next},
            } = await spotifyApi.getNewReleases({
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyAlbum[], total, next};
        });
    },
};

const spotifyPlaylistsByCategory: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists-by-category`,
    title: 'Browse Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    filterType: FilterType.ByGenre,
    disabled: isRestrictedApi,
    secondaryItems: spotifyPlaylistItems,

    search(category?: MediaFilter): Pager<MediaPlaylist> {
        if (category) {
            const market = getMarket();
            return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    playlists: {items, total, next},
                } = await spotifyApi.getCategoryPlaylists(category.id, {
                    offset,
                    limit,
                    market,
                });
                return {items: items as SpotifyPlaylist[], total, next};
            });
        } else {
            return new SimplePager();
        }
    },
};

const spotifyCharts: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/charts`,
    title: 'Charts',
    icon: 'chart',
    itemType: ItemType.Playlist,
    disabled: isRestrictedApi,
    secondaryItems: {
        layout: removeGenre(songChartsLayout),
    },

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        const categoryId = spotifySettings.chartsCategoryId;
        if (!categoryId) {
            throw new NoSpotifyChartsError();
        }
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {
                playlists: {items, total, next},
            } = await spotifyApi.getCategoryPlaylists(categoryId, {
                offset,
                limit,
                market,
            });
            return {
                items: items
                    .filter(exists)
                    .map((item) => ({...item, isChart: true} as SpotifyPlaylist)),
                total,
                next,
            };
        });
    },
};

const spotifySources: readonly AnyMediaSource[] = [
    spotifyLikedSongs,
    spotifyLikedAlbums,
    spotifyFollowedArtists,
    spotifyPlaylists,
    spotifyRecentlyPlayed,
    // spotifyTopTracks,
    // spotifyTopArtists,
    spotifyCharts,
    spotifyFeaturedPlaylists,
    spotifyPlaylistsByCategory,
    spotifyNewReleases,
];

export default spotifySources;

if (isRestrictedApi) {
    // These features are no longer supported by the Spotify Web API.
    // https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api
    setHiddenSources({
        [spotifyCharts.id]: true,
        [spotifyFeaturedPlaylists.id]: true,
        [spotifyPlaylistsByCategory.id]: true,
    });
}

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `${serviceId}/search/${props.id}`,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q);
        },
    };
}

export function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    options?: Partial<PagerConfig<T>>
): Pager<T> {
    if (q) {
        return new SpotifyPager(search(itemType, q), {maxSize: 250, ...options});
    } else {
        return new SimplePager<T>();
    }
}

function search(
    itemType: ItemType,
    q: string
): (offset: number, limit: number) => Promise<SpotifyPage> {
    const market = getMarket();
    switch (itemType) {
        case ItemType.Media:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    tracks: {items, total, next},
                } = await spotifyApi.searchTracks(q, {offset, limit, market});
                return {items, total, next};
            };

        case ItemType.Album:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    albums: {items, total, next},
                } = await spotifyApi.searchAlbums(q, {offset, limit, market});
                return {items: items as SpotifyAlbum[], total, next};
            };

        case ItemType.Artist:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    artists: {items, total, next},
                } = await spotifyApi.searchArtists(q, {offset, limit, market});
                return {items: items as SpotifyArtist[], total, next};
            };

        case ItemType.Playlist:
            return async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {
                    playlists: {items, total, next},
                } = await spotifyApi.searchPlaylists(q, {offset, limit, market});
                return {items: items as SpotifyPlaylist[], total, next};
            };

        default:
            throw TypeError('Search not supported for this type of media');
    }
}

function removeGenre(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        details: layout.details.filter((field) => field !== 'Genre'),
    };
}
