import {Except} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import {exists} from 'utils';
import {NoFavoritesPlaylistError} from 'services/errors';
import SimplePager from 'services/pagers/SimplePager';
import {t} from 'services/i18n';
import {songChartsLayout} from 'components/MediaList/layouts';
import MusicKitPager, {MusicKitPage} from './MusicKitPager';
import MusicKitRecentlyPlayedPager from './MusicKitRecentlyPlayedPager';
import appleSettings from './appleSettings';

const serviceId: MediaServiceId = 'apple';

const radioLayout: MediaListLayout = {
    view: 'card',
    card: {
        h1: 'Title',
        h2: 'Description',
    },
    details: ['Title', 'Description'],
};

const appleLibrarySort: MediaListSort = {
    sortOptions: {
        name: 'Title',
        dateAdded: 'Date Added',
    },
    defaultSort: {
        sortBy: 'dateAdded',
        sortOrder: -1,
    },
};

export const appleSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {
            id: 'songs',
            title: 'Songs',
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
        }),
        createSearch<MediaItem>(
            ItemType.Media,
            {id: 'radio', title: 'Radio', primaryItems: {layout: radioLayout}},
            {types: 'stations'}
        ),
        createSearch<MediaItem>(
            ItemType.Media,
            {id: 'videos', title: 'Videos', mediaType: MediaType.Video},
            {types: 'music-videos'}
        ),
    ],
};

const appleRecommendations: MediaMultiSource = {
    id: `${serviceId}/recommendations`,
    title: 'Recommended',
    icon: 'star',
    sources: [
        createRecommendations<MediaAlbum>('albums', ItemType.Album, {
            id: 'albums',
            title: 'Albums',
        }),
        createRecommendations<MediaPlaylist>('playlists', ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
        }),
        createRecommendations<MediaItem>('stations', ItemType.Media, {
            id: 'radio',
            title: 'Radio',
            primaryItems: {label: 'Radios', layout: radioLayout},
        }),
    ],
};

const appleRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new MusicKitRecentlyPlayedPager();
    },
};

const appleLibrarySongs: MediaSource<MediaItem> = {
    id: `${serviceId}/library-songs`,
    title: 'My Songs',
    icon: 'tick',
    itemType: ItemType.Media,
    lockActionsStore: true,
    defaultHidden: true,
    primaryItems: {sort: appleLibrarySort},

    search(_, {sortBy, sortOrder} = appleLibrarySort.defaultSort): Pager<MediaItem> {
        return new MusicKitPager('/v1/me/library/songs', {
            'include[library-songs]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleLibraryAlbums: MediaSource<MediaAlbum> = {
    id: `${serviceId}/library-albums`,
    title: 'My Albums',
    icon: 'tick',
    itemType: ItemType.Album,
    lockActionsStore: true,
    primaryItems: {sort: appleLibrarySort},

    search(_, {sortBy, sortOrder} = appleLibrarySort.defaultSort): Pager<MediaAlbum> {
        return new MusicKitPager('/v1/me/library/albums', {
            'fields[library-albums]': 'name,artistName,playParams,artwork',
            'include[library-albums]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleLibraryArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/library-artists`,
    title: 'My Artists',
    icon: 'tick',
    itemType: ItemType.Artist,
    lockActionsStore: true,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new MusicKitPager('/v1/me/library/artists', {
            'fields[library-artists]': 'name,playParams,artwork',
            'include[library-artists]': 'catalog',
            'omit[resource:artists]': 'relationships',
        });
    },
};

const appleLibraryPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'My Playlists',
    icon: 'tick',
    itemType: ItemType.Playlist,
    lockActionsStore: true,
    primaryItems: {sort: appleLibrarySort},

    search(_, {sortBy, sortOrder} = appleLibrarySort.defaultSort): Pager<MediaPlaylist> {
        return new MusicKitPager('/v1/me/library/playlists', {
            'fields[library-playlists]': 'name,playParams,artwork',
            'include[library-playlists]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

export const appleEditablePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/editable-playlists`,
    title: 'Editable Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager('/v1/me/library/playlists', {
            'fields[library-playlists]': 'name,playParams,artwork',
            'include[library-playlists]': 'catalog',
            'filter[featured]': 'suggested',
        });
    },
};

const appleLibraryVideos: MediaSource<MediaItem> = {
    id: `${serviceId}/library-videos`,
    title: 'My Videos',
    icon: 'tick',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    lockActionsStore: true,
    defaultHidden: true,
    primaryItems: {
        label: 'Videos',
        sort: appleLibrarySort,
    },

    search(_, {sortBy, sortOrder} = appleLibrarySort.defaultSort): Pager<MediaItem> {
        return new MusicKitPager('/v1/me/library/music-videos', {
            'include[library-music-videos]': 'catalog',
            sort: `${sortOrder === -1 ? '-' : ''}${sortBy}`,
        });
    },
};

const appleFavoriteSongs: MediaSource<MediaItem> = {
    id: `${serviceId}/favorite-songs`,
    get title(): string {
        return t('Favorite Songs');
    },
    icon: 'star',
    itemType: ItemType.Media,
    defaultHidden: true,

    search(): Pager<MediaItem> {
        const playlistId = appleSettings.favoriteSongsId;
        if (!playlistId) {
            throw new NoFavoritesPlaylistError();
        }
        return new MusicKitPager(
            `/v1/me/library/playlists/${playlistId}/tracks`,
            {'include[library-songs]': 'catalog'},
            undefined,
            {
                src: `apple:library-playlists:${playlistId}`,
                itemType: ItemType.Playlist,
            } as MediaPlaylist
        );
    },
};

const appleSongCharts: MediaSource<MediaItem> = {
    id: `${serviceId}/top-songs`,
    title: 'Top Songs',
    icon: 'chart',
    itemType: ItemType.Media,
    filterType: FilterType.ByGenre,
    primaryItems: {layout: songChartsLayout},

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new MusicKitPager(
                '/v1/catalog/{{storefrontId}}/charts',
                {types: 'songs', genre: genre.id},
                {maxSize: 200, pageSize: 50},
                undefined,
                (response: any): MusicKitPage => {
                    const result = response.results?.songs?.[0] || {data: []};
                    const nextPageUrl = result.next;
                    return {items: result.data, nextPageUrl};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const appleAlbumCharts: MediaSource<MediaAlbum> = {
    id: `${serviceId}/top-albums`,
    title: 'Top Albums',
    icon: 'chart',
    itemType: ItemType.Album,
    filterType: FilterType.ByGenre,
    primaryItems: {
        layout: {
            view: 'card compact',
            card: {
                index: 'Index',
                h1: 'Title',
                h2: 'Artist',
                h3: 'Year',
            },
            details: ['Index', 'Title', 'Artist', 'Year'],
        },
    },

    search(genre?: MediaFilter): Pager<MediaAlbum> {
        if (genre) {
            return new MusicKitPager(
                '/v1/catalog/{{storefrontId}}/charts',
                {types: 'albums', genre: genre.id},
                {maxSize: 200, pageSize: 50},
                undefined,
                (response: any): MusicKitPage => {
                    const result = response.results?.albums?.[0] || {data: []};
                    const nextPageUrl = result.next;
                    return {items: result.data, nextPageUrl};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const applePlaylistCharts: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/top-playlists`,
    title: 'Top Playlists',
    icon: 'chart',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    primaryItems: {
        layout: {
            view: 'card compact',
            card: {
                index: 'Index',
                h1: 'Name',
                h2: 'Owner',
                h3: 'Progress',
                data: 'TrackCount',
            },
            details: ['Index', 'Name', 'Owner', 'TrackCount', 'Progress'],
        },
    },

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/charts',
            {types: 'playlists'},
            {maxSize: 200, pageSize: 50},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results?.playlists?.[0] || {data: []};
                const nextPageUrl = result.next;
                return {items: result.data, nextPageUrl};
            }
        );
    },
};

const appleMusicVideoCharts: MediaSource<MediaItem> = {
    id: `${serviceId}/top-videos`,
    title: 'Top Videos',
    icon: 'chart',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    filterType: FilterType.ByGenre,
    defaultHidden: true,
    primaryItems: {
        label: 'Videos',
        layout: songChartsLayout,
    },

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new MusicKitPager(
                '/v1/catalog/{{storefrontId}}/charts',
                {types: 'music-videos', genre: genre.id},
                {maxSize: 200, pageSize: 50},
                undefined,
                (response: any): MusicKitPage => {
                    const result = response.results?.['music-videos']?.[0] || {data: []};
                    const nextPageUrl = result.next;
                    return {items: result.data, nextPageUrl};
                }
            );
        } else {
            return new SimplePager();
        }
    },
};

const appleGlobalCharts: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/global-charts`,
    title: 'Daily Top 100',
    icon: 'chart',
    itemType: ItemType.Playlist,
    secondaryItems: {
        layout: {
            ...songChartsLayout,
            view: 'card small',
        },
    },

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/charts',
            {chartId: 'daily-global-top', with: 'dailyGlobalTopCharts'},
            {pageSize: 50},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results?.dailyGlobalTopCharts?.[0] || {data: []};
                const nextPageUrl = result.next;
                return {items: result.data, nextPageUrl};
            }
        );
    },
};

const appleCityCharts: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/city-charts`,
    title: 'City Charts',
    icon: 'chart',
    itemType: ItemType.Playlist,
    defaultHidden: true,
    secondaryItems: {
        layout: {
            ...songChartsLayout,
            view: 'card small',
        },
    },

    search(): Pager<MediaPlaylist> {
        return new MusicKitPager(
            '/v1/catalog/{{storefrontId}}/charts',
            {chartId: 'city-top', with: 'cityCharts'},
            {pageSize: 50},
            undefined,
            (response: any): MusicKitPage => {
                const result = response.results?.cityCharts?.[0] || {data: []};
                const nextPageUrl = result.next;
                return {items: result.data, nextPageUrl};
            }
        );
    },
};

const appleRadio: MediaSource<MediaItem> = {
    id: `${serviceId}/radio`,
    title: 'Radio',
    icon: 'radio',
    itemType: ItemType.Media,
    linearType: LinearType.Station,
    filterType: FilterType.ByAppleStationGenre,
    primaryItems: {
        label: 'Radios',
        layout: radioLayout,
    },

    search(genre?: MediaFilter): Pager<MediaItem> {
        if (genre) {
            return new MusicKitPager(
                `/v1/catalog/{{storefrontId}}/station-genres/${genre.id}/stations`,
                undefined,
                {pageSize: 50}
            );
        } else {
            return new SimplePager();
        }
    },
};

const sources: readonly AnyMediaSource[] = [
    appleLibrarySongs,
    appleLibraryAlbums,
    appleLibraryArtists,
    appleLibraryPlaylists,
    appleLibraryVideos,
    appleFavoriteSongs,
    appleRecentlyPlayed,
    appleRadio,
    appleSongCharts,
    appleAlbumCharts,
    applePlaylistCharts,
    appleMusicVideoCharts,
    appleGlobalCharts,
    appleCityCharts,
    appleRecommendations,
];

export default sources;

function createRecommendations<T extends MediaObject>(
    type: 'albums' | 'playlists' | 'stations',
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        linearType: (type === 'stations' ? LinearType.Station : undefined) as any,
        id: `${serviceId}/recommendations/${props.id}`,
        icon: 'star',

        search(): Pager<T> {
            return new MusicKitPager(
                '/v1/me/recommendations',
                {
                    'format[resources]': 'map',
                    'omit[resource]': 'autos',
                },
                {pageSize: 30},
                undefined,
                ({data = [], resources = {}}: any): MusicKitPage => {
                    const items = data
                        .map((data: any) => resources['personal-recommendation'][data.id])
                        .filter(exists)
                        .map((recommendation: MusicKit.Resource) =>
                            recommendation.relationships.contents.data.filter(
                                (data: any) => data.type === type
                            )
                        )
                        .flat()
                        .map((data: any) => resources[type][data.id])
                        .filter(exists);
                    const total = items.length;
                    return {items, total, atEnd: true};
                }
            );
        },
    };
}

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    props: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>,
    filters?: MusicKit.QueryParameters,
    options?: Partial<PagerConfig<T>>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `${serviceId}/search/${props.id}`,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q, filters, options);
        },
    };
}

function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    filters?: MusicKit.QueryParameters,
    options?: Partial<PagerConfig<T>>
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
            '/v1/catalog/{{storefrontId}}/search',
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
