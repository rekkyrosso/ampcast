import {Primitive} from 'type-fest';
import subsonicSettings from './subsonicSettings';
import {shuffle} from 'utils/utils';

export interface SubsonicSettings {
    host: string;
    credentials: string;
}

async function get<T>(
    path: string,
    params?: Record<string, Primitive>,
    {host, credentials}: SubsonicSettings = subsonicSettings
): Promise<T> {
    if (!credentials) {
        throw Error('No subsonic credentials');
    }
    path = params ? `${path}?${new URLSearchParams(params as any)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }
    const response = await fetch(
        `${host}/rest/${path}${path.includes('?') ? '&' : '?'}${credentials}`,
        {
            method: 'GET',
            headers: {Accept: 'application/json'},
        }
    );
    if (!response.ok) {
        throw response;
    }
    const {['subsonic-response']: data} = await response.json();
    if (data.error) {
        throw Error(data.error.message || 'Failed');
    }
    return data;
}

async function getAlbum(id: string, settings?: SubsonicSettings): Promise<Subsonic.Album> {
    const data = await get<{album: Subsonic.Album}>('getAlbum', {id}, settings);
    return data.album;
}

async function getAlbumInfo(
    id: string,
    isDir?: boolean,
    settings?: SubsonicSettings
): Promise<Subsonic.AlbumInfo> {
    const data = await get<{albumInfo: Subsonic.AlbumInfo}>(
        `getAlbumInfo${isDir ? '' : '2'}`,
        {id},
        settings
    );
    return data.albumInfo;
}

async function getAlbumList(
    params: Record<string, Primitive>,
    settings?: SubsonicSettings
): Promise<Subsonic.Album[]> {
    const data = await get<{albumList: {album: Subsonic.Album[]}}>(
        'getAlbumList',
        params,
        settings
    );
    return (
        data.albumList.album?.map((album) => ({
            ...album,
            name: album.name || (album as any).album || '[Unknown Album]',
        })) || []
    );
}

async function getAlbumTracks(
    id: string,
    isDir?: boolean,
    settings?: SubsonicSettings
): Promise<Subsonic.Song[]> {
    if (isDir) {
        const data = await get<{directory: {child: Subsonic.Song[]}}>(
            'getMusicDirectory',
            {id},
            settings
        );
        return data.directory.child || [];
    } else {
        const data = await get<{album: {song: Subsonic.Song[]}}>('getAlbum', {id}, settings);
        return data.album.song || [];
    }
}

async function getAlbumsByGenre(
    genre: string,
    offset: number,
    size: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Album[]> {
    return getAlbumList({type: 'byGenre', genre, size, offset}, settings);
}

async function getArtist(id: string, settings?: SubsonicSettings): Promise<Subsonic.Artist> {
    const data = await get<{artist: Subsonic.Artist}>('getArtist', {id}, settings);
    return data.artist;
}

async function getArtists(settings?: SubsonicSettings): Promise<Subsonic.Artist[]> {
    const data = await get<{artists: {index: [{artist: Subsonic.Artist[]}]}}>(
        'getArtists',
        undefined,
        settings
    );
    return data.artists.index.map((index) => index.artist).flat();
}

async function getArtistAlbums(id: string, settings?: SubsonicSettings): Promise<Subsonic.Album[]> {
    const data = await get<{artist: {album: Subsonic.Album[]}}>('getArtist', {id}, settings);
    return data.artist.album || [];
}

async function getArtistInfo(
    id: string,
    settings?: SubsonicSettings
): Promise<Subsonic.ArtistInfo> {
    const data = await get<{artistInfo2: Subsonic.ArtistInfo}>('getArtistInfo2', {id}, settings);
    return data.artistInfo2;
}

async function getArtistTopTracks(
    artist: string,
    count = 10,
    settings?: SubsonicSettings
): Promise<Subsonic.MediaItem[]> {
    const data = await get<{topSongs: {song: Subsonic.MediaItem[]}}>(
        'getTopSongs',
        {artist, count},
        settings
    );
    return data.topSongs.song || [];
}

async function getGenres(settings?: SubsonicSettings): Promise<Subsonic.Genre[]> {
    const data = await get<{genres: {genre: Subsonic.Genre[]}}>('getGenres', undefined, settings);
    return data.genres.genre || [];
}

async function getIndexes(
    musicFolderId: string,
    settings?: SubsonicSettings
): Promise<Subsonic.Index[]> {
    const data = await get<{indexes: {index: Subsonic.Index[]}}>(
        'getIndexes',
        {musicFolderId},
        settings
    );
    return data.indexes.index || [];
}

async function getLikedAlbums(
    offset: number,
    size: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Album[]> {
    return getAlbumList({type: 'starred', size, offset}, settings);
}

async function getLikedArtists(settings?: SubsonicSettings): Promise<Subsonic.Artist[]> {
    const data = await get<{starred2: {artist: Subsonic.Artist[]}}>(
        'getStarred2',
        undefined,
        settings
    );
    return data.starred2.artist || [];
}

async function getLikedSongs(settings?: SubsonicSettings): Promise<Subsonic.Song[]> {
    const data = await get<{starred2: {song: Subsonic.Song[]}}>('getStarred2', undefined, settings);
    return data.starred2.song || [];
}

async function getMostPlayed(
    offset: number,
    size: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Album[]> {
    return getAlbumList({type: 'frequent', size, offset}, settings);
}

async function getMusicDirectory(
    id: string,
    settings?: SubsonicSettings
): Promise<Subsonic.Directory> {
    const data = await get<{directory: Subsonic.Directory}>('getMusicDirectory', {id}, settings);
    return data.directory;
}

async function getMusicFolders(settings?: SubsonicSettings): Promise<Subsonic.MusicFolder[]> {
    const data = await get<{musicFolders: {musicFolder: Subsonic.MusicFolder[]}}>(
        'getMusicFolders',
        undefined,
        settings
    );
    return data.musicFolders.musicFolder || [];
}

async function getPlaylist(id: string, settings?: SubsonicSettings): Promise<Subsonic.Playlist> {
    const data = await get<{playlist: Subsonic.Playlist}>('getPlaylist', {id}, settings);
    return data.playlist;
}

async function getPlaylists(settings?: SubsonicSettings): Promise<Subsonic.Playlist[]> {
    const data = await get<{playlists: {playlist: Subsonic.Playlist[]}}>(
        'getPlaylists',
        undefined,
        settings
    );
    return data.playlists.playlist || [];
}

async function getPlaylistItems(
    id: string,
    settings?: SubsonicSettings
): Promise<Subsonic.MediaItem[]> {
    const data = await get<{playlist: {entry: Subsonic.MediaItem[]}}>(
        'getPlaylist',
        {id},
        settings
    );
    return data.playlist.entry || [];
}

async function getRandomAlbums(size = 100, settings?: SubsonicSettings): Promise<Subsonic.Album[]> {
    return getAlbumList({type: 'random', size, offset: 0}, settings);
}

async function getRandomArtists(
    size = 100,
    settings?: SubsonicSettings
): Promise<Subsonic.Artist[]> {
    const artists = await getArtists(settings);
    return shuffle(artists).slice(0, size);
}

async function getRandomSongs(size = 100, settings?: SubsonicSettings): Promise<Subsonic.Song[]> {
    const data = await get<{randomSongs: {song: Subsonic.Song[]}}>(
        'getRandomSongs',
        {size},
        settings
    );
    return data.randomSongs.song || [];
}

async function getRecentlyPlayed(
    offset: number,
    size: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Album[]> {
    return getAlbumList({type: 'recent', size, offset}, settings);
}

async function getSong(id: string, settings?: SubsonicSettings): Promise<Subsonic.Song> {
    const data = await get<{song: Subsonic.Song}>('getSong', {id}, settings);
    return data.song;
}

async function getSongsByGenre(
    genre: string,
    offset: number,
    count: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Song[]> {
    const data = await get<{songsByGenre: {song: Subsonic.Song[]}}>(
        'getSongsByGenre',
        {genre, offset, count},
        settings
    );
    return data.songsByGenre.song || [];
}

async function getVideos(settings?: SubsonicSettings): Promise<Subsonic.Video[]> {
    const data = await get<{videos: {video: Subsonic.Video[]}}>('getVideos', undefined, settings);
    return data.videos.video || [];
}

async function searchSongs(
    query: string,
    songOffset: number,
    songCount: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Song[]> {
    const data = await get<{searchResult3: {song?: Subsonic.Song[]}}>(
        'search3',
        {query, songOffset, songCount, albumCount: 0, artistCount: 0},
        settings
    );
    return data.searchResult3.song || [];
}

async function searchAlbums(
    query: string,
    albumOffset: number,
    albumCount: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Album[]> {
    const data = await get<{searchResult2: {album?: Subsonic.Album[]}}>(
        'search2',
        {query, albumCount, albumOffset, songCount: 0, artistCount: 0},
        settings
    );
    return (
        data.searchResult2.album?.map((album) => ({
            ...album,
            name: album.name || (album as any).album || '[Unknown Album]',
        })) || []
    );
}

async function searchArtists(
    query: string,
    artistOffset: number,
    artistCount: number,
    settings?: SubsonicSettings
): Promise<Subsonic.Artist[]> {
    const data = await get<{searchResult3: {artist?: Subsonic.Artist[]}}>(
        'search3',
        {query, artistOffset, artistCount, songCount: 0, albumCount: 0},
        settings
    );
    return data.searchResult3.artist || [];
}

async function scrobble(
    params: Subsonic.ScrobbleParams,
    settings?: SubsonicSettings
): Promise<Response> {
    return get('scrobble', params as any, settings);
}

function getPlayableUrlFromSrc(
    src: string,
    {host, credentials}: SubsonicSettings = subsonicSettings
): string {
    const [, , id] = src.split(':');
    return `${host}/rest/stream?id=${id}&${credentials}`;
}

const subsonicApi = {
    get,
    getAlbum,
    getAlbumInfo,
    getAlbumTracks,
    getAlbumsByGenre,
    getArtist,
    getArtists,
    getArtistAlbums,
    getArtistInfo,
    getArtistTopTracks,
    getGenres,
    getIndexes,
    getLikedAlbums,
    getLikedArtists,
    getLikedSongs,
    getMostPlayed,
    getMusicDirectory,
    getMusicFolders,
    getPlayableUrlFromSrc,
    getPlaylist,
    getPlaylists,
    getPlaylistItems,
    getRandomAlbums,
    getRandomArtists,
    getRandomSongs,
    getRecentlyPlayed,
    getSong,
    getSongsByGenre,
    getVideos,
    scrobble,
    searchAlbums,
    searchArtists,
    searchSongs,
};

export default subsonicApi;
