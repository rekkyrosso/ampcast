import {mergeMap, skipWhile, take, tap} from 'rxjs';
import SpotifyWebApi from 'spotify-web-api-js';
import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager, {PagerConfig} from 'types/Pager';
import SimplePager from 'services/pagers/SimplePager';
import {Logger} from 'utils';
import {
    observeAccessToken,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
    authSettings,
} from './spotifyAuth';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';

console.log('module::spotify');

const logger = new Logger('spotify');

export const spotifyApi = new SpotifyWebApi();

export type SpotifyArtist = SpotifyApi.ArtistObjectFull;
export type SpotifyAlbum = SpotifyApi.AlbumObjectFull;
export type SpotifyPlaylist = SpotifyApi.PlaylistObjectFull;
export type SpotifyTrack = SpotifyApi.TrackObjectSimplified &
    Partial<SpotifyApi.TrackObjectFull> & {
        played_at?: string; // ISO string
    };
export type SpotifyEpisode = SpotifyApi.EpisodeObjectFull & {
    played_at?: string; // ISO string
}; // TODO: get rid of this somehow
export type SpotifyItem =
    | SpotifyArtist
    | SpotifyAlbum
    | SpotifyTrack
    | SpotifyEpisode
    | SpotifyPlaylist;

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'Duration'],
};

const defaultArtistLayout: MediaSourceLayout<MediaArtist> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Genre'],
};

const spotifyRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'spotify/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total} = await spotifyApi.getMyRecentlyPlayedTracks({
                    limit,
                });
                return {
                    items: items.map(
                        (item) => ({played_at: item.played_at, ...item.track} as SpotifyTrack)
                    ),
                    total,
                    next: undefined, // deliberately ignore this
                };
            },
            {maxSize: 50, pageSize: 50}
        );
    },
};

const spotifyTopTracks: MediaSource<MediaItem> = {
    id: 'spotify/top-tracks',
    title: 'Top Tracks',
    icon: 'star',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            return spotifyApi.getMyTopTracks({offset, limit});
        });
    },
};

const spotifyTopArtists: MediaSource<MediaArtist> = {
    id: 'spotify/top-artists',
    title: 'Top Artists',
    icon: 'star',
    itemType: ItemType.Artist,
    layout: defaultArtistLayout,
    defaultHidden: true,

    search(): Pager<MediaArtist> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            return spotifyApi.getMyTopArtists({offset, limit});
        });
    },
};

const spotifyLikedSongs: MediaSource<MediaItem> = {
    id: 'spotify/liked-songs',
    title: 'Liked Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getMySavedTracks({offset, limit, market});
            return {items: items.map((item) => item.track), total, next};
        });
    },
};

const spotifyLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'spotify/liked-albums',
    title: 'Liked Albums',
    icon: 'heart',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        const market = getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getMySavedAlbums({
                    offset,
                    limit,
                    market,
                });
                return {items: items.map((item) => item.album), total, next};
            },
            {calculatePageSize: true}
        );
    },
};

const spotifyPlaylists: MediaSource<MediaPlaylist> = {
    id: 'spotify/playlists',
    title: 'Playlists',
    icon: 'playlists',
    itemType: ItemType.Playlist,

    search(): Pager<MediaPlaylist> {
        const market = getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getUserPlaylists(undefined, {
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyPlaylist[], total, next};
        });
    },
};

const spotify: MediaService = {
    id: 'spotify',
    name: 'Spotify',
    icon: 'spotify',
    url: 'https://www.spotify.com/',
    lookup: createLookupPager,
    roots: [
        createRoot(ItemType.Media, {title: 'Songs', layout: defaultLayout}),
        createRoot(ItemType.Album, {title: 'Albums'}),
        createRoot(ItemType.Artist, {title: 'Artists', layout: defaultArtistLayout}),
        createRoot(ItemType.Playlist, {title: 'Playlists'}),
    ],
    sources: [
        spotifyRecentlyPlayed,
        spotifyTopTracks,
        spotifyTopArtists,
        spotifyLikedSongs,
        spotifyLikedAlbums,
        spotifyPlaylists,
    ],

    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default spotify;

observeAccessToken().subscribe((token) => spotifyApi.setAccessToken(token));

if (!getMarket()) {
    observeAccessToken()
        .pipe(
            skipWhile((token) => !token),
            mergeMap(() => spotifyApi.getMe()),
            tap((me) => authSettings.setString('market', me.country)),
            take(1)
        )
        .subscribe(logger);
}

function createRoot<T extends MediaObject>(
    itemType: ItemType,
    props: Except<MediaSource<T>, 'id' | 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: String(itemType),
        icon: 'search',
        searchable: true,

        search({q = ''}: {q?: string} = {}): Pager<T> {
            return createSearchPager(itemType, q);
        },
    };
}

function createLookupPager(
    artist: string,
    title: string,
    options?: Partial<PagerConfig>
): Pager<MediaItem> {
    if (!artist || !title) {
        new SimplePager();
    }
    const safeString = (s: string) => s.replace(/['"]/g, ' ');
    return createSearchPager(
        ItemType.Media,
        `${safeString(title)} artist:${safeString(artist)}`,
        options
    );
}

function createSearchPager<T extends MediaObject>(
    itemType: T['itemType'],
    q: string,
    options?: Partial<PagerConfig>
): Pager<T> {
    if (q) {
        return new SpotifyPager(getFetch(itemType, q), {maxSize: 250, ...options});
    } else {
        return new SimplePager<T>();
    }
}

function getFetch(
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
    }
}

function getMarket(): string {
    return authSettings.getString('market');
}
