import SpotifyWebApi from 'spotify-web-api-js';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import SimplePager from 'services/SimplePager';
import {observeAccessToken, observeIsLoggedIn, login, logout} from './spotifyAuth';
import SpotifyPager, {SpotifyPage} from './SpotifyPager';

console.log('module::spotify');

export const spotifyApi = new SpotifyWebApi();

observeAccessToken().subscribe((token) => spotifyApi.setAccessToken(token));

export type SpotifyArtist = SpotifyApi.ArtistObjectFull;
export type SpotifyAlbum = SpotifyApi.AlbumObjectFull;
export type SpotifyPlaylist = SpotifyApi.PlaylistObjectFull;
export type SpotifyTrack = SpotifyApi.TrackObjectSimplified &
    Partial<Pick<SpotifyApi.TrackObjectFull, 'album'>> & {
        played_at?: string; // ISO string
    };
export type SpotifyEpisode = SpotifyApi.EpisodeObjectFull; // TODO: get rid of this somehow
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
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getMyRecentlyPlayedTracks({
                limit,
            });
            return {
                items: items.map(
                    (item) => ({played_at: item.played_at, ...item.track} as SpotifyTrack)
                ),
                total,
                next,
            };
        });
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
            return await spotifyApi.getMyTopTracks({offset, limit});
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
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getMySavedTracks({offset, limit});
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
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getMySavedAlbums({offset, limit});
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
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'TrackCount', 'Owner'],
    },

    search(): Pager<MediaPlaylist> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getUserPlaylists(undefined, {
                offset,
                limit,
            });
            return {items: items as SpotifyPlaylist[], total, next};
        });
    },
};

const spotify: MediaService = {
    id: 'spotify',
    title: 'Spotify',
    icon: 'spotify',
    sources: [
        spotifyRecentlyPlayed,
        spotifyTopTracks,
        spotifyLikedSongs,
        spotifyLikedAlbums,
        spotifyPlaylists,
    ],
    searches: [
        {
            id: 'spotify/search/songs',
            title: 'Songs',
            icon: '',
            itemType: ItemType.Media,
            layout: defaultLayout,
            searchable: true,

            search(q: string): Pager<MediaItem> {
                if (q) {
                    return new SpotifyPager(
                        async (offset: number, limit: number): Promise<SpotifyPage> => {
                            const {
                                tracks: {items, total, next},
                            } = await spotifyApi.searchTracks(q, {offset, limit});
                            return {items, total, next};
                        },
                        {maxSize: 250}
                    );
                } else {
                    return new SimplePager<MediaItem>();
                }
            },
        },
        {
            id: 'spotify/search/albums',
            title: 'Albums',
            icon: '',
            itemType: ItemType.Album,
            searchable: true,

            search(q: string): Pager<MediaAlbum> {
                if (q) {
                    return new SpotifyPager(
                        async (offset: number, limit: number): Promise<SpotifyPage> => {
                            const {
                                albums: {items, total, next},
                            } = await spotifyApi.searchAlbums(q, {offset, limit});
                            return {items: items as SpotifyAlbum[], total, next};
                        },
                        {maxSize: 250}
                    );
                } else {
                    return new SimplePager<MediaAlbum>();
                }
            },
        },
        {
            id: 'spotify/search/artists',
            title: 'Artists',
            icon: '',
            itemType: ItemType.Artist,
            searchable: true,

            search(q: string): Pager<MediaArtist> {
                if (q) {
                    return new SpotifyPager(
                        async (offset: number, limit: number): Promise<SpotifyPage> => {
                            const {
                                artists: {items, total, next},
                            } = await spotifyApi.searchArtists(q, {offset, limit});
                            return {items: items as SpotifyArtist[], total, next};
                        },
                        {maxSize: 250}
                    );
                } else {
                    return new SimplePager<MediaArtist>();
                }
            },
        },
        {
            id: 'spotify/search/playlists',
            title: 'Playlists',
            icon: '',
            itemType: ItemType.Playlist,
            searchable: true,

            search(q: string): Pager<MediaPlaylist> {
                if (q) {
                    return new SpotifyPager(
                        async (offset: number, limit: number): Promise<SpotifyPage> => {
                            const {
                                playlists: {items, total, next},
                            } = await spotifyApi.searchPlaylists(q, {offset, limit});
                            return {items: items as SpotifyPlaylist[], total, next};
                        },
                        {maxSize: 250}
                    );
                } else {
                    return new SimplePager<MediaPlaylist>();
                }
            },
        },
    ],

    observeIsLoggedIn,
    login,
    logout,
};

export default spotify;
