import {nanoid} from 'nanoid';
import md5 from 'md5';
import {Primitive} from 'type-fest';
import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaFilter from 'types/MediaFilter';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaServerSettings from 'types/PersonalMediaServerSettings';
import PlayableItem from 'types/PlayableItem';
import PlaybackType from 'types/PlaybackType';
import type SubsonicSettings from './SubsonicSettings';
import {Logger, chunk, shuffle} from 'utils';
import {createMediaItemFromUrl} from 'services/metadata';

const logger = new Logger('SubsonicApi');

export interface SubsonicApiSettings extends Partial<PersonalMediaServerSettings> {
    host: string;
    credentials: string;
}

export default class SubsonicApi {
    private genres: readonly MediaFilter[] | undefined;

    constructor(
        private readonly serviceId: MediaServiceId,
        private readonly settings: SubsonicApiSettings
    ) {}

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
            throw data.error;
        }
        return data;
    }

    async addToPlaylist(playlistId: string, ids: readonly string[]): Promise<void> {
        const chunks = chunk(ids, 300);
        for (const chunk of chunks) {
            const params = new URLSearchParams({playlistId});
            chunk.forEach((id) => params.append('songIdToAdd', id));
            await this.get(`updatePlaylist?${params}`);
        }
    }

    async createPlaylist(
        name: string,
        description: string,
        isPublic: boolean,
        ids: readonly string[]
    ): Promise<Subsonic.Playlist> {
        let {playlist} = await this.get<Subsonic.CreatePlaylistResponse>('createPlaylist', {
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
            await this.get(`updatePlaylist?${params}`);
        }
        return playlist;
    }

    async removeFromPlaylist(playlistId: string, indexes: readonly number[]): Promise<void> {
        const chunks = chunk(indexes.toSorted((a, b) => a - b), 300).reverse();
        for (const chunk of chunks) {
            const params = new URLSearchParams({playlistId});
            chunk.forEach((index) => params.append('songIndexToRemove', String(index)));
            await this.get(`updatePlaylist?${params}`);
        }
    }

    async createShare(id: string): Promise<string> {
        const data = await this.get<{shares: Subsonic.Shares}>('createShare', {id});
        return data.shares.share[0].url;
    }

    async editPlaylist(playlist: MediaPlaylist): Promise<void> {
        const [, , playlistId] = playlist.src.split(':');
        const params = new URLSearchParams({
            playlistId,
            name: playlist.title,
            comment: playlist.description || '',
            public: String(!!playlist.public),
        });
        await this.get(`updatePlaylist?${params}`);
    }

    async getAlbum(id: string): Promise<Subsonic.Album> {
        const data = await this.get<{album: Subsonic.Album}>('getAlbum', {id});
        return data.album;
    }

    async getAlbumInfo(id: string, isDir?: boolean): Promise<Subsonic.AlbumInfo> {
        const data = await this.get<{albumInfo: Subsonic.AlbumInfo}>(
            `getAlbumInfo${isDir ? '' : '2'}`,
            {id}
        );
        return data.albumInfo;
    }

    async getAlbumTracks(id: string, isDir?: boolean): Promise<Subsonic.Song[]> {
        if (isDir) {
            const data = await this.get<{directory: {child: Subsonic.Song[]}}>(
                'getMusicDirectory',
                {id}
            );
            return (data.directory.child || [])
                .filter((child) => child.type === 'music')
                .sort((a, b) => a.track - b.track);
        } else {
            const data = await this.get<{album: {song: Subsonic.Song[]}}>('getAlbum', {id});
            return data.album.song || [];
        }
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
        const data = await this.get<{artist: Subsonic.Artist}>('getArtist', {id});
        return data.artist;
    }

    async getArtists(): Promise<Subsonic.Artist[]> {
        const musicFolderId = this.settings.libraryId;
        const data = await this.get<{artists: {index: [{artist: Subsonic.Artist[]}]}}>(
            'getArtists',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.artists.index.map((index) => index.artist).flat();
    }

    async getArtistAlbums(id: string): Promise<Subsonic.Album[]> {
        const data = await this.get<{artist: {album: Subsonic.Album[]}}>('getArtist', {id});
        return data.artist.album || [];
    }

    async getArtistInfo(id: string): Promise<Subsonic.ArtistInfo> {
        const data = await this.get<{artistInfo2: Subsonic.ArtistInfo}>('getArtistInfo2', {id});
        return data.artistInfo2;
    }

    async getArtistTopTracks(artist: string, count = 50): Promise<Subsonic.MediaItem[]> {
        const data = await this.get<{topSongs: {song: Subsonic.MediaItem[]}}>('getTopSongs', {
            artist,
            count,
        });
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
                'getGenres',
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
        const data = await this.get<{indexes: {index: Subsonic.Index[]}}>('getIndexes', {
            musicFolderId,
        });
        return data.indexes.index || [];
    }

    async getInternetRadioStations(): Promise<Subsonic.Radio[]> {
        const data = await this.get<{
            internetRadioStations: {internetRadioStation: Subsonic.Radio[]};
        }>('getInternetRadioStations');
        return data.internetRadioStations.internetRadioStation || [];
    }

    async getLikedAlbums(): Promise<Subsonic.Album[]> {
        const musicFolderId = this.settings.libraryId;
        const data = await this.get<{starred2: {album: Subsonic.Album[]}}>(
            'getStarred2',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.starred2.album || [];
    }

    async getLikedArtists(): Promise<Subsonic.Artist[]> {
        const musicFolderId = this.settings.libraryId;
        const data = await this.get<{starred2: {artist: Subsonic.Artist[]}}>(
            'getStarred2',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.starred2.artist || [];
    }

    async getLikedSongs(): Promise<Subsonic.Song[]> {
        const musicFolderId = this.settings.libraryId;
        const data = await this.get<{starred2: {song: Subsonic.Song[]}}>(
            'getStarred2',
            musicFolderId ? {musicFolderId} : undefined
        );
        return data.starred2.song || [];
    }

    async getMostPlayed(offset: number, size: number): Promise<Subsonic.Album[]> {
        return this.getAlbumList({type: 'frequent', size, offset});
    }

    async getMusicDirectory(id: string): Promise<Subsonic.Directory> {
        const data = await this.get<{directory: Subsonic.Directory}>('getMusicDirectory', {id});
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
            'getMusicFolders',
            undefined
        );
        return (
            data.musicFolders.musicFolder
                ?.sort((a, b) => a.name.localeCompare(b.name))
                .map(({id, name: title}) => ({id: String(id), title})) || []
        );
    }

    getPlayableUrl(item: PlayableItem): string {
        const {host, credentials} = this.settings;
        if (host && credentials) {
            if (item.linearType) {
                return item.srcs![0]; // Let this throw
            } else {
                const [, type, id] = item.src.split(':');
                if (item.playbackType === PlaybackType.HLS) {
                    return `${host}/rest/hls.m3u8?id=${id}&${credentials}`;
                } else {
                    let url = `${host}/rest/stream?id=${id}&${credentials}`;
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

    async getPlaybackType(item: PlayableItem): Promise<PlaybackType> {
        if (item.playbackType !== undefined) {
            return item.playbackType;
        }
        if (item.linearType === LinearType.Station) {
            const url = item.srcs![0]; // Let this throw
            const mediaItem = await createMediaItemFromUrl(url);
            return mediaItem.playbackType || PlaybackType.Direct;
        }
        return PlaybackType.Direct;
    }

    async getPlaylist(id: string): Promise<Subsonic.Playlist> {
        const data = await this.get<{playlist: Subsonic.Playlist}>('getPlaylist', {id});
        return data.playlist;
    }

    async getPlaylists(): Promise<Subsonic.Playlist[]> {
        const data = await this.get<{playlists: {playlist: Subsonic.Playlist[]}}>(
            'getPlaylists',
            undefined
        );
        return data.playlists.playlist || [];
    }

    async getPlaylistItems(id: string): Promise<Subsonic.MediaItem[]> {
        const data = await this.get<{playlist: {entry: Subsonic.MediaItem[]}}>('getPlaylist', {id});
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
        const musicFolderId = this.settings.libraryId;
        const data = await this.get<{randomSongs: {song: Subsonic.Song[]}}>(
            'getRandomSongs',
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
        return {
            'Server type': data.type || '',
            'Server version': data.serverVersion || '',
            'Subsonic version': data.version || '',
        };
    }

    async getSong(id: string): Promise<Subsonic.Song> {
        const data = await this.get<{song: Subsonic.Song}>('getSong', {id});
        return data.song;
    }

    async getSongsByGenre(genre: string, offset: number, count: number): Promise<Subsonic.Song[]> {
        const musicFolderId = this.settings.libraryId;
        const params = {genre, offset, count};
        const data = await this.get<{songsByGenre: {song: Subsonic.Song[]}}>(
            'getSongsByGenre',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.songsByGenre.song || [];
    }

    async getTopAlbums(offset: number, size: number): Promise<Subsonic.Album[]> {
        // Doesn't work for older Subsonic servers.
        return this.getAlbumList({type: 'highest', size, offset});
    }

    async getVideos(): Promise<Subsonic.Video[]> {
        const data = await this.get<{videos: {video: Subsonic.Video[]}}>('getVideos');
        return data.videos.video || [];
    }

    async login(
        host: string,
        userName: string,
        password: string,
        useProxy?: boolean
    ): Promise<string> {
        if (useProxy) {
            const authUrl = `${host}/rest/ping`;
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
    ): Promise<Subsonic.PingResponse> {
        return this.get<Subsonic.PingResponse>('ping', undefined, {host, credentials});
    }

    async scrobble(params: Subsonic.ScrobbleParams): Promise<Response> {
        return this.get('scrobble', params as any);
    }

    async searchSongs(
        query: string,
        songOffset: number,
        songCount: number
    ): Promise<Subsonic.Song[]> {
        const musicFolderId = this.settings.libraryId;
        const params = {query, songOffset, songCount, albumCount: 0, artistCount: 0};
        const data = await this.get<{searchResult3: {song?: Subsonic.Song[]}}>(
            'search3',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.searchResult3.song || [];
    }

    async searchAlbums(
        query: string,
        albumOffset: number,
        albumCount: number
    ): Promise<Subsonic.Album[]> {
        const musicFolderId = this.settings.libraryId;
        const params = {query, albumCount, albumOffset, songCount: 0, artistCount: 0};
        const data = await this.get<{searchResult3: {album?: Subsonic.Album[]}}>(
            'search3',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.searchResult3.album || [];
    }

    async searchArtists(
        query: string,
        artistOffset: number,
        artistCount: number
    ): Promise<Subsonic.Artist[]> {
        const musicFolderId = this.settings.libraryId;
        const params = {query, artistOffset, artistCount, songCount: 0, albumCount: 0};
        const data = await this.get<{searchResult3: {artist?: Subsonic.Artist[]}}>(
            'search3',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.searchResult3.artist || [];
    }

    async setRating(id: string, rating: number): Promise<void> {
        const params = new URLSearchParams({id, rating: String(rating)});
        await this.get(`setRating?${params}`);
    }

    private async getAlbumList(params: Record<string, Primitive>): Promise<Subsonic.Album[]> {
        const musicFolderId = this.settings.libraryId;
        const data = await this.get<{albumList2: {album: Subsonic.Album[]}}>(
            'getAlbumList2',
            musicFolderId ? {...params, musicFolderId} : params
        );
        return data.albumList2.album || [];
    }
}
