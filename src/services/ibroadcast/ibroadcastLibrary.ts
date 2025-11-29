import MiniSearch from 'minisearch';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaPlaylist from 'types/MediaPlaylist';
import {uniq} from 'utils';
import {dispatchMetadataChanges} from 'services/metadata';
import SimplePager from 'services/pagers/SimplePager';
import ibroadcastApi from './ibroadcastApi';
import {getGenres} from './ibroadcastUtils';

export interface IBroadcastLibraryQuery<T extends iBroadcast.LibrarySection> {
    section: T;
    filter?: (
        entry: iBroadcast.LibraryEntry,
        map: iBroadcast.LibrarySectionMap<T>,
        library: iBroadcast.Library,
        id: string
    ) => boolean;
    sort?: (
        a: iBroadcast.LibraryEntry,
        b: iBroadcast.LibraryEntry,
        map: iBroadcast.LibrarySectionMap<T>,
        library: iBroadcast.Library
    ) => number;
    reverse?: boolean;
}

export class IBroadcastLibrary {
    private response: iBroadcast.LibraryResponse | undefined;
    private decades: Partial<Record<'albums' | 'tracks', readonly MediaFilter[]>> = {};
    private genres: Partial<Record<iBroadcast.LibrarySection, readonly MediaFilter[]>> = {};
    private searches: Partial<Record<iBroadcast.LibrarySection, MiniSearch>> = {};
    private searchFields = ['title', 'artist', 'album', 'genre'];

    async load(): Promise<iBroadcast.Library> {
        if (!this.response) {
            this.response = await ibroadcastApi.getLibrary();
        }
        return this.response.library;
    }

    async reload(): Promise<void> {
        if (this.response) {
            this.response = undefined;
            this.decades = {};
            this.genres = {};
            this.searches = {};
        }
        await this.load();
    }

    async addToPlaylist(id: string, trackIds: readonly string[]): Promise<void> {
        await ibroadcastApi.addToPlaylist(Number(id), trackIds.map(Number));
        const library = this.response?.library;
        const playlist = library?.playlists[id];
        if (playlist) {
            const map = library.playlists.map;
            const trackIds: string[] = (playlist[map.tracks] || []).map(String);
            (playlist as any)[map.tracks] = uniq(trackIds.concat(trackIds));
        }
    }

    async createPlaylist(
        title: string,
        description: string,
        isPublic: boolean,
        trackIds: readonly string[]
    ): Promise<MediaPlaylist> {
        const {playlist_id, public_id} = await ibroadcastApi.createPlaylist(
            title,
            description,
            isPublic,
            trackIds.map(Number)
        );
        const library = this.response?.library;
        if (library) {
            const map = library.playlists.map;
            const playlist: iBroadcast.LibraryEntry = [];
            (playlist as any)[map.name] = title;
            (playlist as any)[map.description] = description;
            (playlist as any)[map.public_id] = public_id;
            (playlist as any)[map.tracks] = trackIds;
            library.playlists[playlist_id] = playlist;
        }
        return {
            src: `ibroadcast:playlist:${playlist_id}`,
            title,
            itemType: ItemType.Playlist,
            pager: new SimplePager(),
            trackCount: trackIds.length,
        };
    }

    async deletePlaylist(id: string): Promise<void> {
        await ibroadcastApi.deletePlaylist(Number(id));
        delete this.response?.library.playlists[id];
    }

    async editPlaylist({
        src,
        title: name,
        description = '',
        public: isPublic = false,
    }: MediaPlaylist): Promise<void> {
        const [, , id] = src.split(':');
        const library = this.response?.library;
        const playlist = library?.playlists[id];
        if (playlist) {
            const map = library.playlists.map;
            if (playlist[map.name] !== name || playlist[map.description] !== description) {
                await ibroadcastApi.editPlaylist(Number(id), name, description);
                (playlist as any)[map.name] = name;
                (playlist as any)[map.description] = description;
            }
            if (!isPublic !== !playlist[map.public_id]) {
                if (isPublic) {
                    const public_id = await ibroadcastApi.makePlaylistPublic(Number(id));
                    (playlist as any)[map.public_id] = public_id;
                } else {
                    await ibroadcastApi.revokePlaylistPublic(Number(id));
                    (playlist as any)[map.public_id] = '';
                }
            }
        } else {
            throw Error('Playlist not found');
        }
    }

    async getDecades<T extends 'albums' | 'tracks'>(section: T): Promise<readonly MediaFilter[]> {
        if (!this.decades?.[section]) {
            const library = await this.load();
            const OTHER = -9999;
            const decadesMap = new Map<number, number>();
            const data = library[section];
            const map: iBroadcast.LibrarySectionMap<T> = data.map;
            const ids = Object.keys(data);
            for (const id of ids) {
                if (id !== 'map') {
                    const entry = data[id];
                    let year = entry[map.year];
                    if (!year && section === 'tracks') {
                        const albums = library.albums;
                        const tracks = library.tracks;
                        const album = albums[entry[tracks.map.album_id]];
                        year = album[albums.map.year];
                    }
                    let decade = OTHER;
                    if (!year || year < 1500 || year > 2029) {
                        decade = OTHER;
                    } else if (year < 1900) {
                        decade = Math.floor(year / 100) * 100;
                    } else {
                        decade = Math.floor(year / 10) * 10;
                    }
                    const count = decadesMap.get(decade) || 0;
                    decadesMap.set(decade, count + 1);
                }
            }
            this.decades[section] = [...decadesMap.keys()]
                .sort((a, b) => b - a)
                .map((decade) => ({
                    id: decade === OTHER ? 'other' : String(decade),
                    title: decade === OTHER ? 'Other' : `${decade}s`,
                    count: decadesMap.get(decade),
                }));
        }
        return this.decades[section];
    }

    async getGenres<T extends iBroadcast.LibrarySection>(
        section: T
    ): Promise<readonly MediaFilter[]> {
        if (!this.genres[section]) {
            const library = await this.load();
            const data = library[section];
            const genresMap = new Map<string, number>();
            const ids = Object.keys(data);
            for (const id of ids) {
                if (id !== 'map') {
                    const genres = getGenres<T>(section, data[id], library);
                    if (genres) {
                        for (const genre of genres) {
                            const count = genresMap.get(genre) || 0;
                            genresMap.set(genre, count + 1);
                        }
                    }
                }
            }
            this.genres[section] = [...genresMap.keys()]
                .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}))
                .map((genre) => ({
                    id: genre,
                    title: genre,
                    count: genresMap.get(genre),
                }));
        }
        return this.genres[section];
    }

    async getSystemPlaylistItems(
        playlistType: 'recently-played' | 'recently-uploaded' | 'thumbsup'
    ): Promise<readonly string[]> {
        const library = await this.load();
        const playlists = library.playlists;
        const map = playlists.map;
        const type = map.type;
        const id = Object.keys(playlists).find((id) => playlists[id][type] === playlistType);
        const playlist = playlists[id!];
        const trackIds: string[] | undefined = playlist?.[map.tracks];
        if (trackIds) {
            return trackIds;
        } else {
            throw Error('Not found');
        }
    }

    async rateAlbum(id: string, rating: number): Promise<void> {
        await ibroadcastApi.rateAlbum(id, rating);
        await this.rate('albums', id, rating);
    }

    async rateArtist(id: string, rating: number): Promise<void> {
        await ibroadcastApi.rateArtist(id, rating);
        await this.rate('artists', id, rating);
    }

    async rateTrack(id: string, rating: number): Promise<void> {
        await ibroadcastApi.rateTrack(id, rating);
        await this.rate('tracks', id, rating);
    }

    async search(section: iBroadcast.LibrarySection, q: string): Promise<readonly string[]> {
        if (q) {
            const miniSearch = await this.getSectionSearch(section);
            return miniSearch
                .search(q, {
                    fields: this.searchFields,
                    fuzzy: 0.2,
                    prefix: true,
                    boost: {title: 1.05, album: 0.5, genre: 0.25},
                })
                .map((entry) => entry.id);
        } else {
            return this.query({section, reverse: true});
        }
    }

    async query<T extends iBroadcast.LibrarySection>({
        section,
        filter,
        sort,
        reverse,
    }: IBroadcastLibraryQuery<T>): Promise<readonly string[]> {
        const library = await this.load();
        const data = library[section];
        const playlistsMap = library.playlists.map;
        const map = data.map;
        const ids = Object.keys(data).filter((id) => {
            if (id === 'map') {
                return false;
            }
            if (section === 'playlists' && data[id][playlistsMap.type]) {
                // System playlist.
                return false;
            }
            if (!filter) {
                return true;
            }
            return filter(data[id], map, library, id);
        });
        if (sort) {
            ids.sort((a, b) => sort(data[a], data[b], map, library));
        }
        if (reverse) {
            ids.reverse();
        }
        return ids;
    }

    private async getSectionSearch<T extends iBroadcast.LibrarySection>(
        section: T
    ): Promise<MiniSearch> {
        if (!this.searches[section]) {
            const library = await this.load();
            const artists = library.artists;
            const artistsMap = artists.map;
            const albums = library.albums;
            const albumsMap = albums.map;
            const tracks = library.tracks;
            const tracksMap = tracks.map;
            const playlistsMap = library.playlists.map;
            const data = library[section];
            const map: iBroadcast.LibrarySectionMap<T> = data.map;
            const ids = Object.keys(data).filter(
                (id) =>
                    id !== 'map' && (section === 'playlists' ? !data[id][playlistsMap.type] : true)
            );
            const miniSearch = new MiniSearch({fields: this.searchFields});
            miniSearch.addAll(
                ids.map((id) => ({
                    id,
                    title: data[id][
                        section === 'tracks'
                            ? tracksMap.title
                            : (map as iBroadcast.LibrarySectionMap<Exclude<T, 'tracks'>>).name
                    ],
                    artist:
                        section === 'tracks'
                            ? artists[data[id][tracksMap.artist_id]]?.[artistsMap.name] || ''
                            : section === 'albums'
                            ? artists[data[id][albumsMap.artist_id]]?.[artistsMap.name] || ''
                            : '',
                    album:
                        section === 'tracks'
                            ? albums[data[id][tracksMap.album_id]]?.[albumsMap.name] || ''
                            : '',
                    genre: getGenres(section, data[id], library),
                }))
            );
            this.searches[section] = miniSearch;
        }
        return this.searches[section];
    }

    private async rate<T extends 'artists' | 'albums' | 'tracks'>(
        section: T,
        id: string,
        rating: number
    ): Promise<void> {
        const data = this.response?.library[section];
        if (data) {
            const entry = data[id];
            if (entry) {
                const src = `ibroadcast:${section.slice(0, -1)}:${id}`;
                (entry as any)[data.map.rating] = rating;
                dispatchMetadataChanges({
                    match: (object) => object.src === src,
                    values: {rating},
                });
            }
        }
    }
}

export default new IBroadcastLibrary();
