import type {Observable} from 'rxjs';
import {filter, Subject} from 'rxjs';
import MiniSearch from 'minisearch';
import MediaFilter from 'types/MediaFilter';
import MediaPlaylist from 'types/MediaPlaylist';
import {Logger, uniq} from 'utils';
import {dispatchMetadataChanges} from 'services/metadata';
import ibroadcastApi from './ibroadcastApi';
import {createMediaPlaylist, getGenres, getIdFromSrc} from './ibroadcastUtils';

const logger = new Logger('ibroadcastLibrary');

export type IBroadcastLibraryChange<
    T extends iBroadcast.LibrarySection = iBroadcast.LibrarySection
> = {
    readonly library: iBroadcast.Library;
    readonly section: T;
    readonly map: iBroadcast.LibrarySectionMap<T>;
} & (
    | {
          readonly type: 'section';
      }
    | {
          readonly type: 'data';
          readonly id: number;
          readonly fields: readonly (keyof iBroadcast.LibrarySectionMap<T>)[];
      }
);

export interface IBroadcastLibraryQuery<T extends iBroadcast.LibrarySection> {
    section: T;
    filter?: (
        entry: iBroadcast.LibraryEntry,
        map: iBroadcast.LibrarySectionMap<T>,
        library: iBroadcast.Library,
        id: number
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
    private readonly change$ = new Subject<IBroadcastLibraryChange>();

    observeChanges<T extends iBroadcast.LibrarySection>(
        section: T
    ): Observable<IBroadcastLibraryChange<T>> {
        return this.change$.pipe(filter((change) => change.section === section)) as Observable<
            IBroadcastLibraryChange<T>
        >;
    }

    observePlaylistsChanges(): Observable<IBroadcastLibraryChange<'playlists'>> {
        return this.observeChanges('playlists').pipe(filter((change) => change.type === 'section'));
    }

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

    async addToPlaylist(
        id: number,
        tracksToAdd: readonly number[],
        position = -1 // append
    ): Promise<void> {
        const library = await this.load();
        tracksToAdd = tracksToAdd.filter((id) => !!library.tracks[id]);
        const playlist = library.playlists[id];
        if (playlist) {
            const map = library.playlists.map;
            const newTracks: number[] = (playlist[map.tracks] || []).slice();
            if (position >= 0 && position < newTracks.length) {
                newTracks.splice(position, 0, ...tracksToAdd);
            } else {
                newTracks.push(...tracksToAdd);
            }
            await this.updatePlaylistTracks(id, newTracks);
        } else {
            throw Error('Playlist not found');
        }
    }

    async createPlaylist(
        title: string,
        description: string,
        isPublic: boolean,
        tracks: readonly number[]
    ): Promise<MediaPlaylist> {
        const library = await this.load();
        tracks = tracks.filter((id) => !!library.tracks[id]);
        const {playlist_id, public_id} = await ibroadcastApi.createPlaylist(
            title,
            description,
            isPublic,
            tracks
        );
        const map = library.playlists.map;
        const playlist: any[] = [];
        playlist[map.name] = title;
        playlist[map.description] = description;
        playlist[map.public_id] = public_id;
        playlist[map.tracks] = tracks;
        library.playlists[playlist_id] = playlist;
        this.dispatchSectionChange(library, 'playlists');
        return createMediaPlaylist(playlist_id, library);
    }

    async deletePlaylist(id: number): Promise<void> {
        await ibroadcastApi.deletePlaylist(id);
        const library = this.response?.library;
        if (library) {
            delete library.playlists[id];
            this.dispatchSectionChange(library, 'playlists');
        }
    }

    async editPlaylist({
        src,
        title: name,
        description = '',
        public: isPublic = false,
    }: MediaPlaylist): Promise<void> {
        const id = getIdFromSrc({src});
        const library = await this.load();
        const playlist = library.playlists[id];
        if (playlist) {
            const map = library.playlists.map;
            const fields: (keyof iBroadcast.LibrarySectionMap<'playlists'>)[] = [];
            if (playlist[map.name] !== name || playlist[map.description] !== description) {
                await ibroadcastApi.editPlaylist(id, name, description);
                (playlist as any)[map.name] = name;
                (playlist as any)[map.description] = description;
                fields.push('name', 'description');
            }
            if (!isPublic !== !playlist[map.public_id]) {
                if (isPublic) {
                    const public_id = await ibroadcastApi.makePlaylistPublic(id);
                    (playlist as any)[map.public_id] = public_id;
                } else {
                    await ibroadcastApi.revokePlaylistPublic(id);
                    (playlist as any)[map.public_id] = null;
                }
                fields.push('public_id');
            }
            if (fields.length > 0) {
                this.dispatchDataChange(library, 'playlists', id, fields);
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

    async getPlaylistByName(name: string): Promise<MediaPlaylist | undefined> {
        const library = await this.load();
        const playlists = library.playlists;
        const map = playlists.map;
        const id = Object.keys(playlists).find((id) => playlists[id][map.name] === name);
        if (id) {
            return createMediaPlaylist(Number(id), library);
        }
    }

    async movePlaylistTracks(
        id: number,
        tracksToMove: readonly number[],
        beforeIndex: number
    ): Promise<void> {
        const library = await this.load();
        const playlists = library.playlists;
        const playlist = library.playlists[id];
        if (playlist) {
            const map = playlists.map;
            const currentTracks: readonly number[] = playlist[map.tracks] || [];
            const beforeId = currentTracks[beforeIndex];
            if (tracksToMove.includes(beforeId)) {
                // selection hasn't moved
                return;
            }
            const newTracks = currentTracks.filter((id) => !tracksToMove.includes(id));
            if (beforeIndex >= 0) {
                newTracks.splice(beforeIndex, 0, ...tracksToMove);
            } else {
                newTracks.push(...tracksToMove);
            }
            await this.updatePlaylistTracks(id, newTracks);
        } else {
            throw Error('Playlist not found');
        }
    }

    async rateAlbum(id: number, rating: number): Promise<void> {
        await ibroadcastApi.rateAlbum(id, rating);
        this.updateRating('albums', id, rating);
    }

    async rateArtist(id: number, rating: number): Promise<void> {
        await ibroadcastApi.rateArtist(id, rating);
        this.updateRating('artists', id, rating);
    }

    async rateTrack(id: number, rating: number): Promise<void> {
        await ibroadcastApi.rateTrack(id, rating);
        this.updateRating('tracks', id, rating);
    }

    async removePlaylistTracks(id: number, tracksToRemove: readonly number[]): Promise<void> {
        const library = await this.load();
        const playlists = library.playlists;
        const playlist = library.playlists[id];
        if (playlist) {
            const map = playlists.map;
            const currentTracks: readonly number[] = playlist[map.tracks] || [];
            const newTracks = currentTracks.filter((id) => !tracksToRemove.includes(id));
            await this.updatePlaylistTracks(id, newTracks);
        } else {
            throw Error('Playlist not found');
        }
    }

    async search<T extends iBroadcast.LibrarySection>(
        section: T,
        q: string
    ): Promise<readonly number[]> {
        if (q) {
            const miniSearch = await this.getSectionSearch(section);
            return miniSearch
                .search(q, {
                    fields: this.searchFields,
                    fuzzy: 0.2,
                    prefix: true,
                    boost: {title: 1.05, album: 0.5, genre: 0.25},
                })
                .map((result) => result.id);
        } else {
            return this.query<T>({
                section,
                filter: (entry, map) =>
                    !!entry[(map as any)[section === 'tracks' ? 'title' : 'name']],
                reverse: true,
            });
        }
    }

    async updatePlaylistTracks(id: number, tracks: readonly number[]): Promise<void> {
        const library = await this.load();
        const playlists = library.playlists;
        const playlist = playlists[id];
        if (playlist) {
            tracks = uniq(tracks);
            const map = playlists.map;
            const prevTracks: number[] = playlist[map.tracks] || [];
            (playlist as any)[map.tracks] = tracks;
            this.dispatchDataChange(library, 'playlists', id, ['tracks']);
            dispatchMetadataChanges({
                match: (item) => item.src === `ibroadcast:playlist:${id}`,
                values: {
                    trackCount: tracks.length,
                    genres: getGenres('playlists', playlist, library, true),
                },
            });
            try {
                await ibroadcastApi.updatePlaylistTracks(id, tracks);
            } catch (err) {
                if (tracks.length === 0 && prevTracks.length !== 0) {
                    // Clearing playlists is currently not working. So reduce to a single track.
                    await ibroadcastApi.updatePlaylistTracks(id, [prevTracks[0]]);
                } else {
                    logger.info('Failed to update playlist');
                    logger.error(err);
                }
            }
        } else {
            throw Error('Playlist not found');
        }
    }

    async query<T extends iBroadcast.LibrarySection>({
        section,
        filter,
        sort,
        reverse,
    }: IBroadcastLibraryQuery<T>): Promise<readonly number[]> {
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
            return filter(data[id], map, library, Number(id));
        });
        if (sort) {
            ids.sort((a, b) => sort(data[a], data[b], map, library));
        }
        if (reverse) {
            ids.reverse();
        }
        return ids.map(Number);
    }

    private dispatchDataChange<T extends iBroadcast.LibrarySection>(
        library: iBroadcast.Library,
        section: T,
        id: number,
        fields: readonly (keyof iBroadcast.LibrarySectionMap<T>)[]
    ): void {
        this.change$.next({
            type: 'data',
            library,
            section,
            id,
            fields: fields as any,
            map: library[section].map,
        });
    }

    private dispatchSectionChange<T extends iBroadcast.LibrarySection>(
        library: iBroadcast.Library,
        section: T
    ): void {
        this.change$.next({
            type: 'section',
            library,
            section,
            map: library[section].map,
        });
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
                    id: Number(id),
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
            if (section === 'playlists') {
                // Don't cache.
                return miniSearch;
            }
            this.searches[section] = miniSearch;
        }
        return this.searches[section];
    }

    private updateRating<T extends iBroadcast.RateableLibrarySection>(
        section: T,
        id: number,
        rating: number
    ): void {
        const library = this.response?.library;
        if (library) {
            const data = library[section];
            const entry = data[id];
            if (entry) {
                (entry as any)[data.map.rating] = rating;
            }
        }
    }
}

export default new IBroadcastLibrary();
