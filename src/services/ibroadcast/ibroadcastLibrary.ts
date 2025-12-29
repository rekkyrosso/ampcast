import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, filter, fromEvent, map, skipWhile, tap} from 'rxjs';
import MiniSearch from 'minisearch';
import MediaFilter from 'types/MediaFilter';
import MediaPlaylist from 'types/MediaPlaylist';
import {Logger, uniq} from 'utils';
import {observeIsLoggedIn} from 'services/mediaServices';
import {dispatchMetadataChanges} from 'services/metadata';
import ibroadcastApi from './ibroadcastApi';
import {createMediaPlaylist, getGenres, getIdFromSrc, getSystemPlaylistId} from './ibroadcastUtils';

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
    private readonly change$ = new Subject<IBroadcastLibraryChange>();
    private readonly id$ = new BehaviorSubject(1);
    private readonly searchFields = ['title', 'artist', 'album', 'genre'];
    // Caches.
    private response: iBroadcast.LibraryResponse | undefined;
    private albumsDiscIds: Record<string, readonly string[]> | undefined = undefined;
    private decades: Partial<Record<'albums' | 'tracks', readonly MediaFilter[]>> = {};
    private genres: Partial<Record<iBroadcast.LibrarySection, readonly MediaFilter[]>> = {};
    private searches: Partial<Record<iBroadcast.LibrarySection, MiniSearch>> = {};

    constructor() {
        // Clear the library after logout.
        observeIsLoggedIn('ibroadcast')
            .pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                filter((isLoggedIn) => !isLoggedIn),
                tap(() => this.clear())
            )
            .subscribe(logger);

        fromEvent(window, 'pagehide').subscribe(() => this.clear());
    }

    observeChanges<T extends iBroadcast.LibrarySection>(
        section: T
    ): Observable<IBroadcastLibraryChange<T>> {
        return this.change$.pipe(filter((change) => change.section === section)) as Observable<
            IBroadcastLibraryChange<T>
        >;
    }

    observeId(): Observable<string> {
        return this.id$.pipe(map((id) => String(id)));
    }

    observePlaylistsChanges(): Observable<IBroadcastLibraryChange<'playlists'>> {
        return this.observeChanges('playlists').pipe(filter((change) => change.type === 'section'));
    }

    observeSystemPlaylistChanges(
        playlistType: iBroadcast.SystemPlaylistType
    ): Observable<IBroadcastLibraryChange<'playlists'>> {
        return this.observeChanges('playlists').pipe(
            filter((change) => {
                if (change.type === 'data' && change.fields.includes('tracks')) {
                    return change.id === getSystemPlaylistId(change.library, playlistType);
                } else {
                    return false;
                }
            })
        );
    }

    get id(): string {
        return String(this.id$.value);
    }

    async load(): Promise<iBroadcast.Library> {
        if (!this.response) {
            this.response = await ibroadcastApi.getLibrary();
        }
        return this.response.library;
    }

    async reload(): Promise<void> {
        this.clear();
        await this.load();
        this.id$.next(this.id$.value + 1);
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
        const library = await this.load();
        delete library.playlists[id];
        this.dispatchSectionChange(library, 'playlists');
        await ibroadcastApi.deletePlaylist(id);
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

    getAlbumTracks(library: iBroadcast.Library, id: number): readonly number[] {
        const albums = library.albums;
        const tracks = library.tracks;
        const map = albums.map;
        const tracksMap = tracks.map;
        const discs = this.getAlbumDiscIds(library, id);
        return discs
            .map(
                (id) =>
                    albums[id][map.tracks]?.sort(
                        (a: number, b: number) =>
                            tracks[a][tracksMap.track] - tracks[b][tracksMap.track]
                    ) || []
            )
            .flat();
    }

    async getDecades<T extends 'albums' | 'tracks'>(section: T): Promise<readonly MediaFilter[]> {
        if (!this.decades?.[section]) {
            const library = await this.load();
            const OTHER = -9999;
            const decadesMap = new Map<number, number>();
            const data = library[section];
            const map: iBroadcast.LibrarySectionMap<T> = data.map;
            const ids = this.getIdsAsString(library, section);
            for (const id of ids) {
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
            const ids = this.getIdsAsString(library, section);
            for (const id of ids) {
                const genres = getGenres<T>(section, data[id], library);
                if (genres) {
                    for (const genre of genres) {
                        const count = genresMap.get(genre) || 0;
                        genresMap.set(genre, count + 1);
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

    isAlbumMultiDisc(library: iBroadcast.Library, id: number): boolean {
        const discs = this.getAlbumDiscIds(library, id);
        if (discs.length > 1) {
            return true;
        }
        const albums = library.albums;
        return albums[discs[0]][albums.map.disc] > 1;
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

    async query<T extends iBroadcast.LibrarySection>({
        section,
        filter,
        sort,
        reverse,
    }: IBroadcastLibraryQuery<T>): Promise<readonly number[]> {
        const library = await this.load();
        const data = library[section];
        const map = data.map;
        const ids = this.getIdsAsString(library, section).filter((id) => {
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

    async rateAlbum(id: number, rating: number): Promise<void> {
        const library = await this.load();
        const discs = this.getAlbumDiscIds(library, id);
        discs.forEach((id) => this.updateRating('albums', Number(id), rating));
        await Promise.all(discs.map((id) => ibroadcastApi.rateAlbum(Number(id), rating)));
    }

    async rateArtist(id: number, rating: number): Promise<void> {
        this.updateRating('artists', id, rating);
        await ibroadcastApi.rateArtist(id, rating);
    }

    async rateTrack(id: number, rating: number): Promise<void> {
        this.updateRating('tracks', id, rating);
        await ibroadcastApi.rateTrack(id, rating);
    }

    async removePlaylistTracks(id: number, tracksToRemove: readonly number[]): Promise<void> {
        const library = await this.load();
        const playlists = library.playlists;
        const playlist = playlists[id];
        if (playlist) {
            const map = playlists.map;
            const currentTracks: readonly number[] = playlist[map.tracks] || [];
            const newTracks = currentTracks.filter((id) => !tracksToRemove.includes(id));
            await this.updatePlaylistTracks(id, newTracks);
        } else {
            throw Error('Playlist not found');
        }
    }

    async scrobble(id: number, event: 'play' | 'skip', timeStamp: number): Promise<void> {
        try {
            const library = await this.load();
            const tracks = library.tracks;
            const track = library.tracks[id];
            if (track) {
                const map = tracks.map;
                const playCount = track[map.plays] || 0;
                (track as any)[map.plays] = playCount + 1;
                // this.dispatchDataChange(library, 'tracks', id, ['plays']);
                dispatchMetadataChanges({
                    match: (item) => item.src === `ibroadcast:track:${id}`,
                    values: {playCount},
                });
                const playlists = library.playlists;
                const recentlyPlayedId = getSystemPlaylistId(library, 'recently-played');
                const recentlyPlayed = playlists[recentlyPlayedId];
                if (recentlyPlayed) {
                    const map = playlists.map;
                    const tracks = recentlyPlayed[map.tracks] || [];
                    (recentlyPlayed as any)[map.tracks] = uniq([id].concat(tracks));
                    this.dispatchDataChange(library, 'playlists', recentlyPlayedId, ['tracks']);
                }
            } else {
                throw Error('Track not found');
            }
            await ibroadcastApi.scrobble(id, event, timeStamp);
        } catch (err) {
            logger.info('Failed to scrobble track', `(id=${id})`);
            logger.error(err);
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

    private clear(): void {
        this.response = undefined;
        this.albumsDiscIds = undefined;
        this.decades = {};
        this.genres = {};
        this.searches = {};
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

    private getAlbumDiscIds(library: iBroadcast.Library, id: number): readonly string[] {
        const key = this.getAlbumKey(library, id);
        const albumsDiscIds = this.getAlbumsDiscIds(library);
        return albumsDiscIds[key] || [];
    }

    private getAlbumsDiscIds(library: iBroadcast.Library): Record<string, readonly string[]> {
        if (!this.albumsDiscIds) {
            const albumDiscIds: Record<string, string[]> = {};
            const albums = library.albums;
            const map = albums.map;
            Object.keys(albums).forEach((id) => {
                if (id === 'map') {
                    return;
                }
                const key = this.getAlbumKey(library, id);
                const discs = albumDiscIds[key];
                if (discs) {
                    albumDiscIds[key].push(id);
                    albumDiscIds[key].sort((a, b) => albums[a][map.disc] - albums[b][map.disc]);
                } else {
                    albumDiscIds[key] = [id];
                }
            });
            this.albumsDiscIds = albumDiscIds;
        }
        return this.albumsDiscIds;
    }

    private getAlbumKey(library: iBroadcast.Library, id: number | string): string {
        const albums = library.albums;
        const map = albums.map;
        const album = albums[id];
        if (album) {
            return `${album[map.artist_id]}:${album[map.name]}:${album[map.year]}`;
        } else {
            return '';
        }
    }

    private getIdsAsString(
        library: iBroadcast.Library,
        section: iBroadcast.LibrarySection
    ): readonly string[] {
        if (section === 'albums') {
            const albumsDiscIds = this.getAlbumsDiscIds(library);
            return Object.keys(albumsDiscIds).map((key) => albumsDiscIds[key][0]);
        } else {
            const playlistsMap = library.playlists.map;
            const data = library[section];
            return Object.keys(data).filter(
                (id) =>
                    id !== 'map' && (section === 'playlists' ? !data[id][playlistsMap.type] : true)
            );
        }
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
            const data = library[section];
            const map: iBroadcast.LibrarySectionMap<T> = data.map;
            const ids = this.getIdsAsString(library, section);
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
                    genre: section === 'playlists' ? '' : getGenres(section, data[id], library),
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

    private async updatePlaylistTracks(id: number, tracks: readonly number[]): Promise<void> {
        try {
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
                        throw err;
                    }
                }
            } else {
                throw Error('Playlist not found');
            }
        } catch (err) {
            logger.info('Failed to update playlist', `(id=${id})`);
            logger.error(err);
        }
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
