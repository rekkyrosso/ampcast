import {nanoid} from 'nanoid';
import md5 from 'md5';
import {Primitive} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import Lyrics from 'types/Lyrics';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaServerSettings from 'types/PersonalMediaServerSettings';
import PlaybackData from 'types/PlaybackData';
import PlaybackType from 'types/PlaybackType';
import type SubsonicSettings from './SubsonicSettings';
import {
    Logger,
    canProxy,
    chunk,
    getLibraryIdFromPath,
    getMediaObjectId,
    getProxyUrl,
    removeSymbols,
    shuffle,
} from 'utils';
import {createMediaItemFromUrl} from 'services/metadata';

const logger = new Logger('SubsonicApi');

export interface SubsonicApiSettings extends Partial<PersonalMediaServerSettings> {
    host: string;
    credentials: string;
}

export default class SubsonicApi {
    private genres: readonly MediaFilter[] | undefined;
    #openSubsonic: Record<Subsonic.OpenSubsonicExtensionName, boolean | undefined> | undefined;
    #proxy = '';

    constructor(
        private readonly serviceId: MediaServiceId,
        private readonly settings: SubsonicApiSettings
    ) {}

    get host(): string {
        return this.proxy || this.settings.host;
    }

    get openSubsonic():
        | Record<Subsonic.OpenSubsonicExtensionName, boolean | undefined>
        | undefined {
        return this.#openSubsonic;
    }

    get proxy(): string {
        return this.#proxy;
    }

    set proxy(proxy: string) {
        if (canProxy()) {
            this.#proxy = proxy;
        }
    }

    async get<T>(
        path: string,
        params?: Record<string, Primitive>,
        {host, credentials}: Pick<SubsonicSettings, 'host' | 'credentials'> = this.settings
    ): Promise<T> {
        if (!credentials) {
            throw Error('No credentials');
        }
        path = params ? `${path}?${new URLSearchParams(params as any)}` : path;
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        const response = await fetch(
            `${this.proxy || host}/rest/${path}${path.includes('?') ? '&' : '?'}${credentials}`,
            {
                method: 'GET',
                headers: {Accept: 'application/json'},
            }
        );
        if (!response.ok) {
            throw response;
        }
        const result = await response.json();
        if (!result) {
            throw Error('Empty response');
        }
        const data = result['subsonic-response'];
        if (!data) {
            throw Error(result.error_message || 'Empty response');
        }
        if (data.error) {
            throw data.error;
        }
        return data;
    }

    async addToPlaylist(playlistId: string, ids: readonly string[]): Promise<void> {
        const chunks = chunk(ids, 300);
        for (const chunk of chunks) {
            const params = new URLSearchParams({playlistId});
            chunk.forEach((id) => params.append('songIdToAdd', id));
            await this.get(`updatePlaylist.view?${params}`);
        }
    }

    async createPlaylist(
        name: string,
        description: string,
        isPublic: boolean,
        ids: readonly string[]
    ): Promise<Subsonic.Playlist> {
        let {playlist} = await this.get<Subsonic.CreatePlaylistResponse>('createPlaylist.view', {
            name,
        });
        if (!playlist) {
            const playlists = await this.getPlaylists();
            playlist = playlists.findLast((playlist) => playlist.name === name);
            if (!playlist) {
                throw Error('Playlist not found.');
            }
        }
        const chunks = chunk(ids, 300);
        for (const chunk of chunks) {
            const params = new URLSearchParams({
                playlistId: playlist.id,
                comment: description,
                public: String(isPublic),
            });
            chunk.forEach((id) => params.append('songIdToAdd', id));
            await this.get(`updatePlaylist.view?${params}`);
        }
        return playlist;
    }

    async removeFromPlaylist(playlistId: string, indexes: readonly number[]): Promise<void> {
        const chunks = chunk(
            indexes.toSorted((a, b) => a - b),
            300
        ).reverse();
        for (const chunk of chunks) {
            const params = new URLSearchParams({playlistId});
            chunk.forEach((index) => params.append('songIndexToRemove', String(index)));
            await this.get(`updatePlaylist.view?${params}`);
        }
    }

    async createShare(id: string): Promise<string> {
        const data = await this.get<{shares: Subsonic.Shares}>('createShare.view', {id});
        return data.shares.share[0].url;
    }

    async editPlaylist(playlist: MediaPlaylist): Promise<void> {
        const playlistId = getMediaObjectId(playlist);
        const params = new URLSearchParams({
            playlistId,
            name: playlist.title,
            comment: playlist.description || '',
            public: String(!!playlist.public),
        });
        await this.get(`updatePlaylist.view?${params}`);
    }

    async getAlbum(id: string): Promise<Subsonic.Album> {
        const data = await this.get<{album: Subsonic.Album}>('getAlbum.view', {id});
        return data.album;
    }

    async getAlbumInfo(id: string, isDir?: boolean): Promise<Subsonic.AlbumInfo> {
        const data = await this.get<{albumInfo: Subsonic.AlbumInfo}>(
            `getAlbumInfo${isDir ? '' : '2'}.view`,
            {id}
        );
        return data.albumInfo;
    }

    async getAlbumTracks(id: string): Promise<Subsonic.Song[]> {
        const album = await this.getAlbum(id);
        if (!album.song || (album.songCount && album.song.length !== album.songCount)) {
            // Search for the album instead. And get the tracks by directory.
            const albums = await this.searchAlbums2(album.name);
            const [dirId, ...dirIds] = albums.map((album) => album.id);
            let dir: Subsonic.Directory | undefined = await this.getMusicDirectory(dirId);
            if ((dir.child[0] as any)?.albumId !== id) {
                const dirs = await Promise.all(dirIds.map((id) => this.getMusicDirectory(id)));
                dir = dirs.find((dir) => (dir.child[0] as any)?.albumId === id);
            }
            if (dir) {
                const songs = ((dir.child || []) as Subsonic.Song[])
                    .filter((child) => child.type === 'music' && child.albumId === id)
                    .sort((a, b) => a.track - b.track);
                if (songs.length) {
                    return songs;
                }
            }
        }
        return album.song || [];
    }

    async getAlbumsByDecade(
        decade: string,
        offset: number,
        size: number
    ): Promise<Subsonic.Album[]> {
        const toYear = Number(decade);
        const fromYear = toYear + 9;
        return this.getAlbumList({type: 'byYear', fromYear, toYear, size, offset});
    }

    async getAlbumsByGenre(genre: string, offset: number, size: number): Promise<Subsonic.Album[]> {
        return this.getAlbumList({type: 'byGenre', genre, size, offset});
    }

    async getArtist(id: string): Promise<Subsonic.Artist> {
        const data = await this.get<{artist: Subsonic.Artist}>('getArtist.view', {id});
        return data.artist;
    }

    async getArtists(): Promise<Subsonic.Artist[]> {
        const musicFolderId = this.getMusicLibraryId();
        const data = await this.get<{artists: {index: [{artist: Subsonic.Artist[]}]}}>(
            'getArtists.view',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.artists.index.map((index) => index.artist).flat();
    }

    async getArtistAlbums(id: string): Promise<Subsonic.Album[]> {
        const artist = await this.getArtist(id);
        return artist.album || [];
    }

    async getArtistInfo(id: string): Promise<Subsonic.ArtistInfo> {
        const data = await this.get<{artistInfo2: Subsonic.ArtistInfo}>('getArtistInfo2.view', {
            id,
        });
        return data.artistInfo2;
    }

    async getSimilarArtists(id: string): Promise<Subsonic.SimilarArtist[]> {
        const info = await this.getArtistInfo(id);
        return info.similarArtist || [];
    }

    async getSimilarSongs(id: string, count = 200): Promise<Subsonic.Song[]> {
        const data = await this.get<{similarSongs: {song: Subsonic.Song[]}}>(
            'getSimilarSongs.view',
            {
                id,
                count,
            }
        );
        return data.similarSongs.song || [];
    }

    async getSimilarSongs2(artistId: string, count = 200): Promise<Subsonic.Song[]> {
        const data = await this.get<{similarSongs2: {song: Subsonic.Song[]}}>(
            'getSimilarSongs2.view',
            {
                id: artistId,
                count,
            }
        );
        return data.similarSongs2.song || [];
    }

    async getTopSongs(id: string, artist: string, count = 50): Promise<Subsonic.Song[]> {
        const params: Record<string, string | number> = {artist, count};
        if (this.openSubsonic?.topSongsByArtistId) {
            params.id = id;
        }
        const data = await this.get<{topSongs: {song: Subsonic.Song[]}}>(
            'getTopSongs.view',
            params
        );
        return data.topSongs.song || [];
    }

    async getDecades(): Promise<readonly MediaFilter[]> {
        const decades: MediaFilter[] = [];
        let decade = Math.floor(new Date().getFullYear() / 10) * 10;
        while (decade >= 1930) {
            decades.push({
                id: String(decade),
                title: `${decade}s`,
            });
            decade -= 10;
        }
        return decades;
    }

    async getFilters(filterType: FilterType, itemType: ItemType): Promise<readonly MediaFilter[]> {
        switch (filterType) {
            case FilterType.ByDecade:
                return this.getDecades();

            case FilterType.ByGenre:
                return this.getGenres(itemType);

            default:
                throw Error('Not supported');
        }
    }

    async getGenres(itemType: ItemType): Promise<readonly MediaFilter[]> {
        if (!this.genres) {
            const data = await this.get<{genres: {genre: Subsonic.Genre[]}}>(
                'getGenres.view',
                undefined
            );
            this.genres =
                data.genres.genre
                    ?.map(({value: id, albumCount, songCount}) => {
                        const count = itemType === ItemType.Album ? albumCount : songCount;
                        const title = id;
                        return {id, title, count};
                    })
                    .filter((genre) => genre.count > 0)
                    .sort((a, b) => {
                        if (a.count === b.count) {
                            return a.title.localeCompare(b.title);
                        } else {
                            return b.count - a.count;
                        }
                    }) || [];
        }
        return this.genres;
    }

    async getIndexes(musicFolderId: string): Promise<Subsonic.Index[]> {
        const data = await this.get<{indexes: {index: Subsonic.Index[]}}>('getIndexes.view', {
            musicFolderId,
        });
        // The Bandcamp API is currently returning `data.index` instead of `data.indexes`.
        return data.indexes?.index || (data as any).index?.index || [];
    }

    async getInternetRadioStations(): Promise<Subsonic.Radio[]> {
        const data = await this.get<{
            internetRadioStations: {internetRadioStation: Subsonic.Radio[]};
        }>('getInternetRadioStations.view');
        return data.internetRadioStations.internetRadioStation || [];
    }

    async getLikedAlbums(): Promise<Subsonic.Album[]> {
        const musicFolderId = this.getMusicLibraryId();
        const data = await this.get<{starred2: {album: Subsonic.Album[]}}>(
            'getStarred2.view',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.starred2.album || [];
    }

    async getLikedArtists(): Promise<Subsonic.Artist[]> {
        const musicFolderId = this.getMusicLibraryId();
        const data = await this.get<{starred2: {artist: Subsonic.Artist[]}}>(
            'getStarred2.view',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.starred2.artist || [];
    }

    async getLikedSongs(): Promise<Subsonic.Song[]> {
        const musicFolderId = this.getMusicLibraryId();
        const data = await this.get<{starred2: {song: Subsonic.Song[]}}>(
            'getStarred2.view',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.starred2.song || [];
    }

    async getLyrics(item: MediaItem): Promise<Lyrics | null> {
        if (this.openSubsonic?.songLyrics) {
            try {
                const lyrics = await this.getLyricsBySongId(item);
                if (lyrics) {
                    return lyrics;
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return this.getLyricsByArtistAndTitle(item);
    }

    async getMostPlayed(offset: number, size: number): Promise<Subsonic.Album[]> {
        return this.getAlbumList({type: 'frequent', size, offset});
    }

    async getMusicDirectory(id: string): Promise<Subsonic.Directory> {
        const data = await this.get<{directory: Subsonic.Directory}>('getMusicDirectory.view', {
            id,
        });
        return data.directory;
    }

    async getMusicDirectoryItems(id: string): Promise<Subsonic.DirectoryItem[]> {
        const directory = await this.getMusicDirectory(id);
        // Sort folders to the top in alphabetical order. Don't sort the children.
        return directory.child.sort((a, b) => {
            if (a.isDir === b.isDir) {
                if (a.isDir) {
                    return a.title.localeCompare(b.title);
                } else {
                    return 0;
                }
            } else if (a.isDir) {
                return -1;
            }
            return 1;
        });
    }

    async getMusicLibraries(): Promise<PersonalMediaLibrary[]> {
        const data = await this.get<{musicFolders: {musicFolder: Subsonic.MusicFolder[]}}>(
            'getMusicFolders.view',
            undefined
        );
        return (
            data.musicFolders.musicFolder
                ?.sort((a, b) => a.name.localeCompare(b.name))
                .map(({id, name: title}) => ({id: String(id), title})) || []
        );
    }

    getMusicLibraryId(): string {
        return getLibraryIdFromPath() ?? this.settings.libraryId ?? '';
    }

    getPlayableUrl(item: MediaItem): string {
        const {credentials} = this.settings;
        if (this.host && credentials) {
            if (item.linearType === LinearType.Station) {
                const url = item.srcs?.[0];
                if (!url) {
                    throw Error('No radio stream URL');
                }
                return item.proxy ? getProxyUrl(url) : url;
            } else {
                const [, type, ...rest] = item.src.split(':');
                const id = rest.join(':');
                if (item.playbackType === PlaybackType.HLS) {
                    return `${this.host}/rest/hls.m3u8?id=${id}&${credentials}`;
                } else {
                    let url = `${this.host}/rest/stream.view?id=${id}&${credentials}`;
                    if (type === 'video' && this.serviceId === 'airsonic') {
                        url += '&format=raw';
                    }
                    return url;
                }
            }
        } else {
            throw Error('Not logged in');
        }
    }

    async getPlaybackData(item: MediaItem): Promise<PlaybackData> {
        if (item.playbackType === undefined) {
            if (item.linearType === LinearType.Station) {
                const url = item.srcs?.[0];
                if (!url) {
                    throw Error('No radio stream URL');
                }
                const {playbackType = PlaybackType.Direct, proxy} =
                    await createMediaItemFromUrl(url);
                return {playbackType, proxy};
            } else {
                return {playbackType: PlaybackType.Direct};
            }
        } else {
            const {playbackType, proxy} = item;
            return {playbackType, proxy};
        }
    }

    async getPlaylist(id: string): Promise<Subsonic.Playlist> {
        const data = await this.get<{playlist: Subsonic.Playlist}>('getPlaylist.view', {id});
        return data.playlist;
    }

    async getPlaylists(): Promise<Subsonic.Playlist[]> {
        const data = await this.get<{playlists: {playlist: Subsonic.Playlist[]}}>(
            'getPlaylists.view',
            undefined
        );
        return data.playlists.playlist || [];
    }

    async getPlaylistItems(id: string): Promise<Subsonic.MediaItem[]> {
        const data = await this.get<{playlist: {entry: Subsonic.MediaItem[]}}>('getPlaylist.view', {
            id,
        });
        return data.playlist.entry || [];
    }

    async getRandomAlbums(size = 100): Promise<Subsonic.Album[]> {
        return this.getAlbumList({type: 'random', size, offset: 0});
    }

    async getRandomArtists(size = 100): Promise<Subsonic.Artist[]> {
        const artists = await this.getArtists();
        return shuffle(artists).slice(0, size);
    }

    async getRandomSongs(size = 100): Promise<Subsonic.Song[]> {
        const musicFolderId = this.getMusicLibraryId();
        const data = await this.get<{randomSongs: {song: Subsonic.Song[]}}>(
            'getRandomSongs.view',
            musicFolderId ? {musicFolderId, size} : {size}
        );
        return data.randomSongs.song || [];
    }

    async getRecentlyAdded(offset: number, size: number): Promise<Subsonic.Album[]> {
        return this.getAlbumList({type: 'newest', size, offset});
    }

    async getRecentlyPlayed(offset: number, size: number): Promise<Subsonic.Album[]> {
        return this.getAlbumList({type: 'recent', size, offset});
    }

    async getServerInfo(): Promise<Record<string, string>> {
        const data = await this.ping();
        if (!this.#openSubsonic && data.openSubsonic) {
            this.#openSubsonic = await this.getOpenSubsonicExtensions();
        }
        return {
            'Server type': data.type || '',
            'Server version': data.serverVersion || '',
            'Subsonic version': data.version || '',
            OpenSubsonic: String(!!data.openSubsonic),
        };
    }

    async getSong(id: string): Promise<Subsonic.Song> {
        const data = await this.get<{song: Subsonic.Song}>('getSong.view', {id});
        return data.song;
    }

    async getSongsByGenre(genre: string, offset: number, count: number): Promise<Subsonic.Song[]> {
        const musicFolderId = this.getMusicLibraryId();
        const params = {genre, offset, count};
        const data = await this.get<{songsByGenre: {song: Subsonic.Song[]}}>(
            'getSongsByGenre.view',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.songsByGenre.song || [];
    }

    async getTopAlbums(offset: number, size: number): Promise<Subsonic.Album[]> {
        // Doesn't work for older Subsonic servers.
        return this.getAlbumList({type: 'highest', size, offset});
    }

    async getVideos(): Promise<Subsonic.Video[]> {
        const data = await this.get<{videos: {video: Subsonic.Video[]}}>('getVideos.view');
        return data.videos.video || [];
    }

    async login(
        host: string,
        userName: string,
        password: string,
        useProxy?: boolean
    ): Promise<string> {
        if (useProxy) {
            const authUrl = `${host}/rest/ping.view`;
            const response = await fetch(
                `/proxy-login?server=${this.serviceId}&url=${encodeURIComponent(authUrl)}`,
                {
                    method: 'GET',
                    headers: {Accept: 'application/json'},
                }
            );
            if (!response.ok) {
                throw response;
            }
            const {['subsonic-response']: data, ['ampcast-response']: auth} = await response.json();
            if (data.error) {
                throw data.error;
            }
            if (!auth) {
                throw Error('No credentials');
            }
            return JSON.stringify(auth);
        } else {
            const login = async (params: Record<string, string>): Promise<string> => {
                const credentials = new URLSearchParams({
                    u: userName,
                    ...params,
                    c: __app_name__,
                    f: 'json',
                });
                const data = await this.ping(host, String(credentials));
                if (data.version) {
                    credentials.set('v', data.version);
                }
                return JSON.stringify({userName, credentials: String(credentials)});
            };

            try {
                const salt = nanoid(12);
                const token = md5(password + salt);
                const auth = await login({t: token, s: salt, v: '1.13.0'});
                return auth;
            } catch {
                try {
                    logger.log('Login failed. Attempting legacy login...');
                    const auth = await login({
                        p: `enc:${Array.from(new TextEncoder().encode(password))
                            .map((byte) => byte.toString(16).padStart(2, '0'))
                            .join('')}`,
                        v: '1.12.0',
                    });
                    return auth;
                } catch {
                    logger.log('Login failed. Attempting simple login...');
                    const auth = await login({p: password, v: '1.12.0'});
                    return auth;
                }
            }
        }
    }

    async ping(
        host = this.settings.host,
        credentials = this.settings.credentials
    ): Promise<Subsonic.Ping> {
        return this.get<Subsonic.Ping>('ping.view', undefined, {host, credentials});
    }

    async reportPlayback(params: Subsonic.ReportPlaybackParams): Promise<void> {
        if (!this.openSubsonic?.playbackReport) {
            throw Error('Not supported');
        }
        await this.get('reportPlayback.view', params as any);
    }

    async scrobble(params: Subsonic.ScrobbleParams): Promise<void> {
        await this.get('scrobble.view', params as any);
    }

    async searchSongs(
        query: string,
        songOffset: number,
        songCount: number
    ): Promise<Subsonic.Song[]> {
        query = removeSymbols(query);
        const musicFolderId = this.getMusicLibraryId();
        const params = {query, songOffset, songCount, albumCount: 0, artistCount: 0};
        const data = await this.get<{searchResult3: {song?: Subsonic.Song[]}}>(
            'search3.view',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.searchResult3.song || [];
    }

    async searchAlbums(
        query: string,
        albumOffset: number,
        albumCount: number
    ): Promise<Subsonic.Album[]> {
        if (query) {
            query = removeSymbols(query);
            const musicFolderId = this.getMusicLibraryId();
            const params = {query, albumCount, albumOffset, songCount: 0, artistCount: 0};
            const data = await this.get<{searchResult3: {album?: Subsonic.Album[]}}>(
                'search3.view',
                musicFolderId ? {...params, musicFolderId} : params
            );
            return data.searchResult3.album || [];
        } else {
            return this.getAlbumList({
                size: albumCount,
                offset: albumOffset,
                type: 'alphabeticalByArtist',
            });
        }
    }

    async searchAlbums2(query: string, albumOffset = 0, albumCount = 5): Promise<Subsonic.Album[]> {
        query = removeSymbols(query);
        const musicFolderId = this.getMusicLibraryId();
        const params = {query, albumCount, albumOffset, songCount: 0, artistCount: 0};
        const data = await this.get<{searchResult2: {album?: Subsonic.Album[]}}>(
            'search2.view',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.searchResult2.album || [];
    }

    async searchArtists(
        query: string,
        artistOffset: number,
        artistCount: number
    ): Promise<Subsonic.Artist[]> {
        query = removeSymbols(query);
        const musicFolderId = this.getMusicLibraryId();
        const params = {query, artistOffset, artistCount, songCount: 0, albumCount: 0};
        const data = await this.get<{searchResult3: {artist?: Subsonic.Artist[]}}>(
            'search3.view',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.searchResult3.artist || [];
    }

    async setRating(id: string, rating: number): Promise<void> {
        const params = new URLSearchParams({id, rating: String(rating)});
        await this.get(`setRating.view?${params}`);
    }

    private async getAlbumList(params: Record<string, Primitive>): Promise<Subsonic.Album[]> {
        const musicFolderId = this.getMusicLibraryId();
        const data = await this.get<{albumList2: {album: Subsonic.Album[]}}>(
            'getAlbumList2.view',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.albumList2.album || [];
    }

    private async getLyricsByArtistAndTitle(item: MediaItem): Promise<Lyrics | null> {
        const {artists: [artist = ''] = [], title} = item;
        if (artist && title) {
            const data = await this.get<{lyrics?: Subsonic.Lyrics}>('getLyrics.view', {
                artist,
                title,
            });
            const text = data.lyrics?.value;
            if (text) {
                return {plain: text.split(/\n/)};
            }
        }
        return null;
    }

    private async getLyricsBySongId(item: MediaItem): Promise<Lyrics | null> {
        if (!this.openSubsonic?.songLyrics) {
            throw Error('Not supported');
        }
        const id = getMediaObjectId(item);
        const data = await this.get<{lyricsList: Subsonic.LyricsList}>('getLyricsBySongId.view', {
            id,
        });
        const lyrics = data.lyricsList.structuredLyrics?.filter((lyrics) => lyrics.synced)[0];
        if (lyrics) {
            const lines = lyrics.line;
            if (lyrics.synced) {
                const synced: Lyrics['synced'] = lines.map((line, index) => {
                    const nextLine = lines[index + 1];
                    return {
                        startTime: (line.start || 0) / 1000,
                        endTime: (nextLine?.start || 0) / 1000,
                        text: line.value || '',
                    };
                });
                const plain = synced.map((line) => line.text);
                return {plain, synced};
            } else {
                return {plain: lines.map((line) => line.value || '')};
            }
        }
        return null;
    }

    private async getOpenSubsonicExtensions(): Promise<Record<string, boolean | undefined>> {
        try {
            const data = await this.get<{
                openSubsonicExtensions: Subsonic.OpenSubsonicExtension[];
            }>('getOpenSubsonicExtensions.view');
            const extensions: Record<string, boolean | undefined> = {};
            data.openSubsonicExtensions.forEach((extension) => (extensions[extension.name] = true));
            return extensions;
        } catch (err) {
            logger.error(err);
            return {};
        }
    }
}
