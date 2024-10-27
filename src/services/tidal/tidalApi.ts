import {credentialsProvider} from '@tidal-music/auth';
import {createCatalogueClient, components as CatalogueComponents} from '@tidal-music/catalogue';
import {createPlaylistClient} from '@tidal-music/playlist';
import {createSearchClient} from '@tidal-music/search';
import {createUserClient, components as UserComponents} from '@tidal-music/user';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import {exists, parseISO8601, Logger} from 'utils';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import tidalSettings from './tidalSettings';
import TidalPager, {TidalPage} from './TidalPager';

type CatalogueSchema = CatalogueComponents['schemas'];
type UserSchema = UserComponents['schemas'];

type TidalAlbum = CatalogueSchema['Albums_Resource'];
type TidalArtist = CatalogueSchema['Artists_Resource'];
type TidalTrack = CatalogueSchema['Tracks_Resource'];
type TidalVideo = CatalogueSchema['Videos_Resource'];
type TidalPlaylist = CatalogueSchema['Playlists_Resource'];
type TidalProvider = CatalogueSchema['Providers_Resource'];
type TidalRecommendations = UserSchema['User_Recommendations_Resource'];
type TidalUser = CatalogueSchema['Users_Resource'];
type TidalError = CatalogueSchema['Error_Object'];
type Included = (
    | TidalAlbum
    | TidalArtist
    | TidalTrack
    | TidalVideo
    | TidalPlaylist
    | TidalProvider
    | TidalUser
)[];

interface TidalRecommendationsData {
    data?: TidalRecommendations;
    included?: (
        | UserSchema['Playlists_Resource']
        | UserSchema['Tracks_Resource']
        | UserSchema['Videos_Resource']
        | UserSchema['Users_Resource']
    )[];
}

type ImageLink =
    | CatalogueSchema['Catalogue_Item_Image_Link']
    | CatalogueSchema['Playlists_Image_Link'];

const logger = new Logger('tidalApi');

const catalogueApi = createCatalogueClient(credentialsProvider);
const playlistApi = createPlaylistClient(credentialsProvider);
const searchApi = createSearchClient(credentialsProvider);
const userApi = createUserClient(credentialsProvider);

async function getAlbum(id: string): Promise<MediaAlbum | null> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/albums/{id}', {
        params: {
            path: {id},
            query: {countryCode, include: ['items', 'artists']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: album, included = []} = data;
    return album ? createMediaAlbum(album, included) : null;
}

async function getAlbums(ids: string[]): Promise<readonly MediaAlbum[]> {
    if (ids.length === 0) {
        return [];
    }
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/albums', {
        params: {
            query: {countryCode, 'filter%5Bid%5D': [ids.join(',')], include: ['artists']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: albums = [], included = []} = data;
    return albums.map((album) => createMediaAlbum(album, included));
}

async function getAlbumTracks(album: TidalAlbum, cursor = ''): Promise<TidalPage<MediaItem>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/albums/{id}/relationships/items', {
        params: {
            path: {id: album.id},
            query: {countryCode, 'page%5Bcursor%5D': cursor},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const trackData = data.data?.flat();
    if (trackData?.length) {
        const ids = trackData.map((data) => data.id);
        const tracks = await getTracks(ids, album);
        const items = tracks.map((track) => {
            const [, , id] = track.src.split(':');
            const meta = trackData.find((data) => data.id === id)?.meta;
            if (meta) {
                return {...track, track: meta.trackNumber, disc: meta.volumeNumber};
            }
            return track;
        });
        const total = album.attributes?.numberOfItems;
        const next = data.links?.next;
        return {items, total, next};
    } else {
        return {items: []};
    }
}

async function getArtist(id: string): Promise<MediaArtist | null> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/artists/{id}', {
        params: {
            path: {id},
            query: {countryCode, include: ['albums']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: artist} = data;
    return artist ? createMediaArtist(artist) : null;
}

async function getArtists(ids: string[]): Promise<readonly MediaArtist[]> {
    if (ids.length === 0) {
        return [];
    }
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/artists', {
        params: {
            query: {countryCode, 'filter%5Bid%5D': [ids.join(',')]},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: artists = []} = data;
    return artists.map((artist) => createMediaArtist(artist));
}

async function getArtistAlbums(artist: TidalArtist, cursor = ''): Promise<TidalPage<MediaAlbum>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/artists/{id}/relationships/albums', {
        params: {
            path: {id: artist.id},
            query: {countryCode, 'page%5Bcursor%5D': cursor},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const albumData = data.data?.flat();
    if (albumData?.length) {
        const ids = albumData.map((data) => data.id);
        const items = await getAlbums(ids);
        // const total = artist.attributes?.numberOfItems;
        const next = data.links?.next;
        return {items, next};
    } else {
        return {items: []};
    }
}

async function getArtistTopTracks(artist: TidalArtist, cursor = ''): Promise<TidalPage<MediaItem>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/artists/{id}/relationships/tracks', {
        params: {
            path: {id: artist.id},
            query: {countryCode, 'page%5Bcursor%5D': cursor},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const trackData = data.data?.flat();
    if (trackData?.length) {
        const ids = trackData.map((data) => data.id);
        const items = await getTracks(ids);
        // const total = artist.attributes?.numberOfItems;
        const next = data.links?.next;
        return {items, next};
    } else {
        return {items: []};
    }
}

async function getArtistVideos(artist: TidalArtist, cursor = ''): Promise<TidalPage<MediaItem>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/artists/{id}/relationships/videos', {
        params: {
            path: {id: artist.id},
            query: {countryCode, 'page%5Bcursor%5D': cursor},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const videoData = data.data?.flat();
    if (videoData?.length) {
        const ids = videoData.map((data) => data.id);
        const items = await getVideos(ids);
        // const total = artist.attributes?.numberOfItems;
        const next = data.links?.next;
        return {items, next};
    } else {
        return {items: []};
    }
}

async function getDailyDiscovery(cursor?: string): Promise<TidalPage<MediaItem>> {
    return getRecommendedPlaylistItems('discoveryMixes', cursor);
}

async function getMe(): Promise<UserSchema['Users_Resource']> {
    const {data, error, response} = await userApi.GET('/users/me');
    if (!response.ok || error) {
        throwError(response, error);
    }
    const userData = data.data;
    if (!userData) {
        throw Error('No user info');
    }
    return userData;
}

async function getMyMixes(): Promise<TidalPage<MediaPlaylist>> {
    return getRecommendedPlaylists('myMixes');
}

async function getNewArrivals(cursor?: string): Promise<TidalPage<MediaItem>> {
    return getRecommendedPlaylistItems('newArrivalMixes', cursor);
}

async function getMyPlaylists(cursor = ''): Promise<TidalPage<MediaPlaylist>> {
    const {data, error, response} = await playlistApi.GET('/playlists/me', {
        params: {
            query: {'page%5Bcursor%5D': cursor} as any,
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: playlists = []} = data;
    const items = playlists.map((playlist) => createMediaPlaylist(playlist));
    return {items};
}

async function getPlaylist(id: string): Promise<MediaPlaylist | null> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await playlistApi.GET('/playlists/{id}', {
        params: {
            path: {id},
            query: {countryCode, include: ['owners']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: playlist} = data;
    return playlist ? createMediaPlaylist(playlist as unknown as TidalPlaylist) : null;
}

async function getPlaylists(ids: string[]): Promise<readonly MediaPlaylist[]> {
    if (ids.length === 0) {
        return [];
    }
    const {countryCode} = tidalSettings;
    const {data, error, response} = await playlistApi.GET('/playlists', {
        params: {
            query: {
                countryCode,
                'filter%5Bid%5D': [ids.join(',')],
                include: ['owners'],
            },
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: playlists = []} = data;
    return playlists.map((playlist) => createMediaPlaylist(playlist));
}

async function getPlaylistItems(
    id: string,
    total?: number,
    cursor = ''
): Promise<TidalPage<MediaItem>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await playlistApi.GET('/playlists/{id}/relationships/items', {
        params: {
            path: {id},
            query: {countryCode, 'page%5Bcursor%5D': cursor},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const playlistData = data.data?.flat();
    if (playlistData?.length) {
        const ids = playlistData.map((data) => data.id);
        const items = await getTracks(ids);
        const next = data.links?.next;
        return {items, total, next};
    } else {
        return {items: []};
    }
}

let currentRecommendations: TidalRecommendationsData | undefined = undefined;
async function getRecommendations(): Promise<TidalRecommendationsData | undefined> {
    const {data, error, response} = await userApi.GET('/userRecommendations/me', {
        params: {
            query: {include: ['myMixes', 'discoveryMixes', 'newArrivalMixes']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    currentRecommendations = data;
    return data;
}

async function getRecommendedPlaylistItems(
    name: 'discoveryMixes' | 'newArrivalMixes',
    cursor?: string
): Promise<TidalPage<MediaItem>> {
    let recommendations: TidalRecommendationsData | undefined;
    try {
        if (cursor) {
            recommendations = currentRecommendations;
        } else {
            recommendations = await getRecommendations();
        }
    } catch (err) {
        recommendations = currentRecommendations;
        if (recommendations) {
            logger.error(err);
        } else {
            throw err;
        }
    }
    if (!recommendations) {
        throw Error('User recommendations not loaded');
    }
    const playlist = recommendations.data?.relationships?.[name]?.data?.[0];
    if (!playlist) {
        throw Error('Failed to load playlist');
    }
    let numberOfItems: number | undefined = undefined;
    const included: TidalRecommendationsData['included'] | undefined = recommendations?.included;
    if (included) {
        const includedPlaylist = included.find(
            (included) => included.type === 'playlists' && included.id === playlist.id
        ) as UserSchema['Playlists_Resource'] | undefined;
        numberOfItems = includedPlaylist?.attributes?.numberOfItems;
    }
    return getPlaylistItems(playlist.id, numberOfItems, cursor);
}

async function getRecommendedPlaylists(
    name: 'myMixes' = 'myMixes'
): Promise<TidalPage<MediaPlaylist>> {
    let recommendations: TidalRecommendationsData | undefined;
    try {
        recommendations = await getRecommendations();
    } catch (err) {
        recommendations = currentRecommendations;
        if (recommendations) {
            logger.error(err);
        } else {
            throw err;
        }
    }
    if (!recommendations) {
        throw Error('User recommendations not loaded');
    }
    const ids = recommendations?.data?.relationships?.[name]?.data?.map((data) => data.id) || [];
    const included = recommendations?.included;
    if (included) {
        const items = ids
            .map((id) =>
                included.find((playlist) => playlist.type === 'playlists' && playlist.id === id)
            )
            .filter(exists)
            .map((playlist) => createMediaPlaylist(playlist as TidalPlaylist));
        return {items};
    } else {
        const items = await getPlaylists(ids);
        return {items};
    }
}

async function getTrack(id: string): Promise<MediaItem | null> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/tracks/{id}', {
        params: {
            path: {id},
            query: {countryCode, include: ['artists', 'albums']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: track, included = []} = data;
    return track ? createMediaItem(track, included) : null;
}

async function getTracks(ids: string[], album?: TidalAlbum): Promise<readonly MediaItem[]> {
    if (ids.length === 0) {
        return [];
    }
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/tracks', {
        params: {
            query: {
                countryCode,
                'filter%5Bid%5D': [ids.join(',')],
                include: ['artists', 'albums'],
            },
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: tracks = [], included = []} = data;
    return tracks.map((track) => createMediaItem(track, included, album));
}

async function getVideo(id: string): Promise<MediaItem | null> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/videos/{id}', {
        params: {
            path: {id},
            query: {countryCode, include: ['artists', 'albums']},
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: video, included = []} = data;
    return video ? createMediaItem(video, included) : null;
}

async function getVideos(ids: string[], album?: TidalAlbum): Promise<readonly MediaItem[]> {
    if (ids.length === 0) {
        return [];
    }
    const {countryCode} = tidalSettings;
    const {data, error, response} = await catalogueApi.GET('/videos', {
        params: {
            query: {
                countryCode,
                'filter%5Bid%5D': [ids.join(',')],
                include: ['artists', 'albums'],
            },
        },
    });
    if (!response.ok || error) {
        throwError(response, error);
    }
    const {data: videos = [], included = []} = data;
    return videos.map((video) => createMediaItem(video, included, album));
}

async function searchAlbums(query: string, cursor = ''): Promise<TidalPage<MediaAlbum>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await searchApi.GET(
        '/searchresults/{query}/relationships/albums',
        {
            params: {
                path: {query},
                query: {countryCode, 'page%5Bcursor%5D': cursor},
            },
        }
    );
    if (!response.ok || error) {
        throwError(response, error);
    }
    const ids = data.data?.map((album) => album.id) || [];
    const items = await getAlbums(ids);
    const next = data.links?.next;
    return {items, next};
}

async function searchArtists(query: string, cursor = ''): Promise<TidalPage<MediaArtist>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await searchApi.GET(
        '/searchresults/{query}/relationships/artists',
        {
            params: {
                path: {query},
                query: {countryCode, include: ['artists'], 'page%5Bcursor%5D': cursor},
            },
        }
    );
    if (!response.ok || error) {
        throwError(response, error);
    }
    const included = data.included;
    const items =
        data.data
            ?.map((data) => {
                const artist = included?.find((artist) => artist.id === data.id);
                if (artist) {
                    return createMediaArtist(artist as TidalArtist);
                }
            })
            .filter(exists) || [];
    const next = data.links?.next;
    return {items, next};
}

async function searchPlaylists(query: string, cursor = ''): Promise<TidalPage<MediaPlaylist>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await searchApi.GET(
        '/searchresults/{query}/relationships/playlists',
        {
            params: {
                path: {query},
                query: {countryCode, include: ['playlists'], 'page%5Bcursor%5D': cursor},
            },
        }
    );
    if (!response.ok || error) {
        throwError(response, error);
    }
    const included = data.included;
    const items =
        data.data
            ?.map((data) => {
                const playlist = included?.find((playlist) => playlist.id === data.id);
                if (playlist) {
                    return createMediaPlaylist(playlist as TidalPlaylist);
                }
            })
            .filter(exists) || [];
    const next = data.links?.next;
    return {items, next};
}

async function searchTracks(query: string, cursor = ''): Promise<TidalPage<MediaItem>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await searchApi.GET(
        '/searchresults/{query}/relationships/tracks',
        {
            params: {
                path: {query},
                query: {countryCode, 'page%5Bcursor%5D': cursor},
            },
        }
    );
    if (!response.ok || error) {
        throwError(response, error);
    }
    const ids = data.data?.map((track) => track.id) || [];
    const items = await getTracks(ids);
    const next = data.links?.next;
    return {items, next};
}

async function searchVideos(query: string, cursor = ''): Promise<TidalPage<MediaItem>> {
    const {countryCode} = tidalSettings;
    const {data, error, response} = await searchApi.GET(
        '/searchresults/{query}/relationships/videos',
        {
            params: {
                path: {query},
                query: {countryCode, 'page%5Bcursor%5D': cursor},
            },
        }
    );
    if (!response.ok || error) {
        throwError(response, error);
    }
    const ids = data.data?.map((video) => video.id) || [];
    const items = await getVideos(ids);
    const next = data.links?.next;
    return {items, next};
}

function createMediaAlbum(album: TidalAlbum, included: Included): MediaAlbum {
    const attributes = album.attributes;
    const albumArtist = findArtist(album.relationships, included);
    const releaseDate = attributes?.releaseDate;
    return {
        itemType: ItemType.Album,
        src: `tidal:album:${album.id}`,
        externalUrl: attributes?.externalLinks?.[0]?.href,
        title: attributes?.title || 'No title',
        artist: albumArtist?.attributes?.name,
        multiDisc: (attributes?.numberOfVolumes || 0) > 1,
        trackCount: attributes?.numberOfItems,
        duration: attributes ? parseISO8601(attributes.duration) : 0,
        year: releaseDate ? new Date(releaseDate).getUTCFullYear() || undefined : undefined,
        thumbnails: createThumbnails(attributes?.imageLinks),
        pager: new TidalPager((cursor) => getAlbumTracks(album, cursor)),
        copyright: attributes?.copyright,
        explicit: attributes?.explicit,
        badge: getBadge(attributes?.mediaTags),
    };
}

function createMediaArtist(artist: TidalArtist): MediaArtist {
    const attributes = artist.attributes;
    return {
        itemType: ItemType.Artist,
        src: `tidal:artist:${artist.id}`,
        externalUrl: attributes?.externalLinks?.[0]?.href,
        title: attributes?.name || 'Unknown',
        thumbnails: createThumbnails(attributes?.imageLinks),
        pager: createArtistAlbumsPager(artist),
    };
}

function createArtistAlbumsPager(artist: TidalArtist): Pager<MediaAlbum> {
    const albumsPager = new TidalPager((cursor) => getArtistAlbums(artist, cursor));
    const topTracks = createArtistTopTracks(artist);
    const videos = createArtistVideos(artist);
    const topPager = new SimpleMediaPager<MediaAlbum>(async () => {
        try {
            const items = await fetchFirstPage(videos.pager, {keepAlive: true});
            return items.length === 0 ? [topTracks] : [topTracks, videos];
        } catch (err) {
            logger.error(err);
            return [topTracks];
        }
    });
    return new WrappedPager(topPager, albumsPager);
}

function createArtistTopTracks(artist: TidalArtist): MediaAlbum {
    const attributes = artist.attributes;
    return {
        itemType: ItemType.Album,
        src: `tidal:top-tracks:${artist.id}`,
        title: 'Top Tracks',
        thumbnails: createThumbnails(attributes?.imageLinks),
        artist: attributes?.name,
        pager: new TidalPager((cursor) => getArtistTopTracks(artist, cursor)),
        synthetic: true,
    };
}

function createArtistVideos(artist: TidalArtist): MediaAlbum {
    const attributes = artist.attributes;
    return {
        itemType: ItemType.Album,
        src: `tidal:videos:${artist.id}`,
        title: 'Music Videos',
        thumbnails: createThumbnails(attributes?.imageLinks),
        artist: attributes?.name,
        pager: new TidalPager((cursor) => getArtistVideos(artist, cursor)),
        synthetic: true,
    };
}

function createMediaItem(
    track: TidalTrack | TidalVideo,
    included: Included,
    album?: TidalAlbum
): MediaItem {
    album = album || findAlbum(track.relationships, included);
    const attributes = track.attributes;
    const albumArtist = findArtist(album?.relationships, included)?.attributes?.name;
    const albumAttributes = album?.attributes;
    const artists = findArtists(track.relationships, included)
        .map((artist) => artist.attributes?.name)
        .filter(exists);
    const releaseDate = albumAttributes?.releaseDate;
    const isVideo = isTidalVideo(track);
    const imageLinks = (track as TidalVideo).attributes?.imageLinks || albumAttributes?.imageLinks;
    return {
        itemType: ItemType.Media,
        mediaType: isVideo ? MediaType.Video : MediaType.Audio,
        // playbackType: PlaybackType.HLS,
        src: `tidal:${isVideo ? 'video' : 'track'}:${track.id}`,
        externalUrl: attributes?.externalLinks?.[0]?.href,
        title: attributes?.title || 'No title',
        artists: artists.length > 0 ? artists : albumArtist ? [albumArtist] : undefined,
        albumArtist: albumArtist,
        album: albumAttributes?.title,
        duration: attributes ? parseISO8601(attributes.duration) : 0,
        playedAt: 0,
        // disc: meta?.volumeNumber,
        // track: meta?.trackNumber,
        year: releaseDate ? new Date(releaseDate).getUTCFullYear() || undefined : undefined,
        isrc: attributes?.isrc,
        thumbnails: createThumbnails(imageLinks),
        copyright: attributes?.copyright,
        explicit: attributes?.explicit,
        badge: getBadge((attributes as TidalTrack['attributes'])?.mediaTags),
    };
}

function createMediaPlaylist(playlist: TidalPlaylist): MediaPlaylist {
    const attributes = playlist.attributes;
    const createdAt = attributes?.createdAt;
    const duration = attributes?.duration;
    return {
        itemType: ItemType.Playlist,
        src: `tidal:playlist:${playlist.id}`,
        externalUrl: attributes?.externalLinks?.[0]?.href,
        title: attributes?.name || 'Unknown',
        description: attributes?.description,
        thumbnails: createThumbnails(attributes?.imageLinks),
        isOwn: playlist.attributes?.privacy === 'PRIVATE',
        addedAt: createdAt ? new Date(createdAt).valueOf() / 1000 || undefined : undefined,
        duration: duration ? parseISO8601(duration) : 0,
        trackCount: attributes?.numberOfItems,
        pager: new TidalPager((cursor) =>
            getPlaylistItems(playlist.id, attributes?.numberOfItems, cursor)
        ),
    };
}

function createThumbnails(imageLinks: ImageLink[] | undefined): readonly Thumbnail[] | undefined {
    return imageLinks
        ?.filter((link) => !!link.meta) // TODO
        .map(({href: url, meta}) => ({url, width: meta!.width, height: meta!.height}));
}

function findAlbum(
    relationships: (TidalArtist | TidalTrack | TidalVideo)['relationships'],
    included: Included
): TidalAlbum | undefined {
    return findAlbums(relationships, included)[0];
}

function findAlbums(
    relationships: (TidalArtist | TidalTrack | TidalVideo)['relationships'],
    included: Included
): readonly TidalAlbum[] {
    const albumIds = relationships?.albums.data?.map((data) => data.id);
    if (albumIds) {
        return included.filter(
            (data) => data.type === 'albums' && albumIds.includes(data.id)
        ) as TidalAlbum[];
    } else {
        return [];
    }
}

function findArtist(
    relationships: (TidalAlbum | TidalTrack | TidalVideo)['relationships'],
    included: Included
): TidalArtist | undefined {
    return findArtists(relationships, included)[0];
}

function findArtists(
    relationships: (TidalAlbum | TidalTrack | TidalVideo)['relationships'],
    included: Included
): readonly TidalArtist[] {
    const artistIds = relationships?.artists.data?.map((data) => data.id);
    if (artistIds) {
        return included.filter(
            (data) => data.type === 'artists' && artistIds.includes(data.id)
        ) as TidalArtist[];
    } else {
        return [];
    }
}

function getBadge(mediaTags: string[] | undefined): string | undefined {
    if (!mediaTags) {
        return undefined;
    }
    return mediaTags.includes('HIRES_LOSSLESS')
        ? 'max'
        : mediaTags.includes('LOSSLESS')
        ? 'high'
        : mediaTags.length === 0
        ? 'low'
        : undefined;
}

function isTidalVideo(item: TidalTrack | TidalVideo): item is TidalVideo {
    return item.type === 'videos';
}

function throwError(response: Response, errorResponse: {errors?: TidalError[]} | undefined): never {
    if (!response.ok) {
        throw response;
    }
    logger.error(errorResponse);
    const [error = Error('Unknown error')] = errorResponse?.errors || [];
    throw error;
}

const tidalApi = {
    getAlbum,
    getAlbums,
    getArtist,
    getArtists,
    getDailyDiscovery,
    getMe,
    getMyMixes,
    getMyPlaylists,
    getNewArrivals,
    getPlaylist,
    getPlaylists,
    getTrack,
    getTracks,
    getVideo,
    getVideos,
    searchAlbums,
    searchArtists,
    searchPlaylists,
    searchTracks,
    searchVideos,
};

export default tidalApi;
