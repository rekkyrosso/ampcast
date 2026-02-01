import {SetOptional, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import SortParams from 'types/SortParams';
import Thumbnail from 'types/Thumbnail';
import {exists, uniq} from 'utils';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import pinStore from 'services/pins/pinStore';
import ibroadcastLibrary from './ibroadcastLibrary';
import IBroadcastPlaylistItemsPager from './IBroadcastPlaylistItemsPager';

export function createMediaObject<T extends MediaObject>(
    section: iBroadcast.LibrarySection,
    id: number,
    library: iBroadcast.Library,
    childSort?: SortParams
): T {
    switch (section) {
        case 'artists':
            return createMediaArtist(id, library, childSort) as T;

        case 'albums':
            return createMediaAlbum(id, library) as T;

        case 'playlists':
            return createMediaPlaylist(id, library, childSort) as T;

        default:
            return createMediaItem(id, library) as T;
    }
}

function createMediaArtist(
    id: number,
    library: iBroadcast.Library,
    albumSort?: SortParams
): MediaArtist {
    const artist = library.artists[id];
    const map = library.artists.map;
    const trackIds: number[] | undefined = artist[map.tracks];
    const mediaArtist: Writable<SetOptional<MediaArtist, 'pager'>> = {
        itemType: ItemType.Artist,
        src: `ibroadcast:artist:${id}`,
        externalUrl: trackIds ? getExternalUrl(id, 'artists') : undefined,
        title: artist[map.name],
        rating: artist[map.rating],
        genres: getGenres('artists', artist, library, true),
        thumbnails: createThumbnails(artist[map.artwork_id]),
    };
    mediaArtist.pager = createArtistAlbumsPager(mediaArtist as MediaArtist, albumSort);
    return mediaArtist as MediaArtist;
}

export function createArtistAlbumsPager(
    artist: MediaArtist,
    albumSort?: SortParams
): Pager<MediaAlbum> {
    const id = getIdFromSrc(artist);
    return new SimpleMediaPager(async () => {
        const library = await ibroadcastLibrary.load();
        const artist = library.artists[id];
        const artistMap = library.artists.map;
        const albumsMap = library.albums.map;
        const tracksMap = library.tracks.map;
        const allTrackIds = new Set<number>(artist?.[artistMap.tracks] || []);
        const albumIds: number[] = [];
        Object.keys(library.albums).forEach((albumId) => {
            const album = library.albums[albumId];
            if (album?.[albumsMap.artist_id] === id) {
                albumIds.push(Number(albumId));
                album[albumsMap.tracks]?.forEach((id: number) => allTrackIds.add(id));
            }
        });
        Object.keys(library.tracks).forEach((trackId) => {
            const track = library.tracks[trackId];
            track[tracksMap.artists_additional]?.forEach((artist: iBroadcast.LibraryEntry) => {
                if (artist[tracksMap.artists_additional_map.artist_id] === id) {
                    allTrackIds.add(Number(trackId));
                }
            });
        });
        if (albumSort) {
            const {sortBy, sortOrder = 1} = albumSort;
            const albums = library.albums;
            albumIds.sort((a, b) =>
                sortAlbums(sortBy, sortOrder, albums[a], albums[b], albumsMap, library)
            );
        }
        const albums = albumIds.map((id) => createMediaAlbum(id, library));
        const allTracksAlbum: MediaAlbum = {
            itemType: ItemType.Album,
            src: `ibroadcast:all-tracks:${id}`,
            title: 'All Tracks',
            artist: artist[artistMap.name],
            thumbnails: createThumbnails(artist[artistMap.artwork_id]),
            pager: new SimpleMediaPager(async () =>
                [...allTrackIds].map((id) => createMediaItem(id, library))
            ),
            trackCount: allTrackIds.size,
            synthetic: true,
        };
        return albums.concat(allTracksAlbum);
    });
}

function createMediaAlbum(id: number, library: iBroadcast.Library): MediaAlbum {
    const albums = library.albums;
    const album = albums[id];
    const map = albums.map;
    const artists = library.artists;
    const tracks = library.tracks;
    const artistId = album[map.artist_id];
    const artist = artists[artistId];
    const trackIds = ibroadcastLibrary.getAlbumTracks(library, id);
    const firstTrack = tracks[trackIds[0]];
    return {
        itemType: ItemType.Album,
        src: `ibroadcast:album:${id}`,
        externalUrl: getExternalUrl(id, 'albums'),
        title: album[map.name],
        thumbnails: createThumbnails(firstTrack?.[tracks.map.artwork_id]),
        trackCount: trackIds.length,
        artist: artistId === 0 ? 'Various Artists' : artist?.[artists.map.name],
        year: album[map.year],
        rating: album[map.rating],
        genres: getGenres('albums', album, library, true),
        multiDisc: ibroadcastLibrary.isAlbumMultiDisc(library, id),
        pager: new SimpleMediaPager(async () => {
            return trackIds.map((id) => createMediaItem(id, library));
        }),
    };
}

export function createMediaPlaylist(
    id: number,
    library: iBroadcast.Library,
    itemSort?: SortParams
): MediaPlaylist {
    const playlists = library.playlists;
    const playlist = playlists[id];
    const map = playlists.map;
    const src = `ibroadcast:playlist:${id}`;
    const trackIds: number[] = playlist[map.tracks];
    const owned = !playlist[map.type];
    const mediaPlaylist: Writable<SetOptional<MediaPlaylist, 'pager'>> = {
        src,
        itemType: ItemType.Playlist,
        externalUrl: getExternalUrl(id, 'playlists'),
        title: playlist[map.name],
        description: playlist[map.description],
        thumbnails: createThumbnails(playlist[map.artwork_id]),
        trackCount: trackIds?.length,
        isPinned: pinStore.isPinned(src),
        owned,
        public: owned && !!playlist[map.public_id],
        editable: true,
        deletable: true,
        genres: getGenres('playlists', playlist, library, true),
        items: {
            deletable: true,
            droppable: true,
            moveable: true,
        },
    };
    mediaPlaylist.pager = createPlaylistItemsPager(mediaPlaylist as MediaPlaylist, itemSort);
    return mediaPlaylist as MediaPlaylist;
}

export function createPlaylistItemsPager(
    playlist: MediaPlaylist,
    itemSort?: SortParams
): Pager<MediaItem> {
    const id = getIdFromSrc(playlist);
    return new IBroadcastPlaylistItemsPager(id, itemSort, {autofill: true, autofillMaxPages: 100});
}

export function createMediaItem(
    id: number,
    library: iBroadcast.Library,
    position?: number
): MediaItem {
    const albums = library.albums;
    const artists = library.artists;
    const tracks = library.tracks;
    const track = tracks[id];
    const map = tracks.map;
    const artist = artists[track[map.artist_id]];
    const album = albums[track[map.album_id]];
    const albumArtistId = album?.[albums.map.artist_id];
    const albumArtist = artists[albumArtistId];
    const replayGain = Number(track[map.replay_gain]);
    const container = track[map.type]?.replace(/^(audio|video)\//, '');
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        src: `ibroadcast:track:${id}`,
        // externalUrl: getExternalUrl(id, 'tracks'), // Doesn't work.
        title: track[map.title],
        fileName: track[map.file],
        duration: track[map.length],
        year: track[map.year] || album?.[albums.map.year],
        addedAt: parseDate(track[map.uploaded_on]), // TODO: uploaded_time
        playedAt: 0,
        playCount: track[map.plays],
        position,
        genres: getGenres('tracks', track, library),
        thumbnails: createThumbnails(track[map.artwork_id]),
        artists: artist ? [artist[artists.map.name]] : undefined,
        album: album?.[albums.map.name],
        albumArtist: albumArtistId === 0 ? 'Various Artists' : albumArtist?.[artists.map.name],
        track: track[map.track],
        disc: album?.[albums.map.disc],
        rating: track[map.rating],
        trackGain: isNaN(replayGain) ? undefined : replayGain,
        container,
        badge: container,
    };
}

function createThumbnails(id: number): Thumbnail[] | undefined {
    return id
        ? [createThumbnail(id, 150), createThumbnail(id, 300), createThumbnail(id, 1000)]
        : undefined;
}

function createThumbnail(id: number, width: number, height = width): Thumbnail {
    const url = `${location.protocol}//artwork.ibroadcast.com/artwork/${id}-${width}`;
    return {url, width, height};
}

export function getGenres<T extends iBroadcast.LibrarySection>(
    section: T,
    entry: iBroadcast.LibraryEntry,
    library: iBroadcast.Library,
    sorted = false
): readonly string[] | undefined {
    const data = library[section];
    if (section === 'tracks') {
        return getTrackGenres(entry, library);
    } else {
        let genres: string[] | undefined;
        const map = data.map as iBroadcast.LibrarySectionMap<Exclude<T, 'tracks'>>;
        const trackIds: number[] = entry[map.tracks];
        const tracks = library.tracks;
        const trackGenres = trackIds
            ?.map((id) => getTrackGenres(tracks[id], library))
            .flat()
            .filter(exists);
        if (trackGenres) {
            if (sorted) {
                const genresMap = new Map<string, number>();
                for (const trackGenre of trackGenres) {
                    const count = genresMap.get(trackGenre) || 0;
                    genresMap.set(trackGenre, count + 1);
                }
                const sorted = new Map([...genresMap].sort((a, b) => b[1] - a[1]));
                genres = [...sorted.keys()];
            } else {
                genres = uniq(trackGenres);
            }
        }
        return genres?.length ? genres.slice(0, 10) : undefined;
    }
}

function getTrackGenres(
    track: iBroadcast.LibraryEntry,
    library: iBroadcast.Library
): readonly string[] | undefined {
    let genres: string[] | undefined;
    const map = library.tracks.map;
    const genre: string = track?.[map.genre];
    if (genre) {
        genres = [genre];
        const genres_additional: string[] | undefined = track[map.genres_additional];
        if (genres_additional?.length) {
            genres.push(...genres_additional);
        }
    }
    return genres?.length ? genres : undefined;
}

function getExternalUrl(id: number, type: string): string {
    return `https://media.ibroadcast.com/?view=container&container_id=${id}&type=${type}`;
}

export function getIdFromSrc(item: {src: string}): number {
    const [, , id] = item.src.split(':');
    return Number(id);
}

export function getLibrarySectionFromItem(item: MediaObject): iBroadcast.LibrarySection {
    switch (item.itemType) {
        case ItemType.Playlist:
            return 'playlists';

        case ItemType.Artist:
            return 'artists';

        case ItemType.Album:
            return 'albums';

        default:
            return 'tracks';
    }
}

export function getSystemPlaylistId(
    library: iBroadcast.Library,
    playlistType: iBroadcast.SystemPlaylistType
): number {
    const playlists = library.playlists;
    const type = playlists.map.type;
    const id = Object.keys(playlists).find((id) => playlists[id][type] === playlistType);
    return Number(id);
}

function parseDate(date?: string | null): number | undefined {
    if (date) {
        const time = Date.parse(date) || 0;
        return time < 0 ? 0 : Math.round(time / 1000);
    }
}

export function sortAlbums(
    sortBy: string,
    sortOrder: 1 | -1,
    a: iBroadcast.LibraryEntry,
    b: iBroadcast.LibraryEntry,
    map: iBroadcast.LibrarySectionMap<'albums'>,
    library: iBroadcast.Library
): number {
    const sortByArtist = () => {
        const artists = library.artists;
        const artistsMap = artists.map;
        const artistA = (artists[a[map.artist_id]]?.[artistsMap.name] || '').replace(
            /^the\s+/i,
            ''
        );
        const artistB = (artists[b[map.artist_id]]?.[artistsMap.name] || '').replace(
            /^the\s+/i,
            ''
        );
        return sortByTitle(artistA, artistB);
    };
    switch (sortBy) {
        case 'title':
            return sortByTitle(a[map.name], b[map.name]) * sortOrder;

        case 'artist':
            return sortByArtist() * sortOrder || sortByTitle(a[map.name], b[map.name]);

        case 'year':
            return (
                (a[map.year] - b[map.year]) * sortOrder ||
                sortByArtist() ||
                sortByTitle(a[map.name], b[map.name])
            );

        default:
            return 0;
    }
}

export function sortTracks(
    sortBy: string,
    sortOrder: 1 | -1,
    a: iBroadcast.LibraryEntry,
    b: iBroadcast.LibraryEntry,
    map: iBroadcast.LibrarySectionMap<'tracks'>,
    library: iBroadcast.Library
): number {
    const sortByAlbum = () => {
        const albums = library.albums;
        const albumsMap = albums.map;
        const albumA = albums[a[map.album_id]]?.[albumsMap.name] || '';
        const albumB = albums[b[map.album_id]]?.[albumsMap.name] || '';
        return sortByTitle(albumA, albumB);
    };
    const sortByArtist = () => {
        const artists = library.artists;
        const artistsMap = artists.map;
        const artistA = (artists[a[map.artist_id]]?.[artistsMap.name] || '').replace(
            /^the\s+/i,
            ''
        );
        const artistB = (artists[b[map.artist_id]]?.[artistsMap.name] || '').replace(
            /^the\s+/i,
            ''
        );
        return sortByTitle(artistA, artistB);
    };
    const sortByYear = () => {
        const albums = library.albums;
        const albumsMap = albums.map;
        const yearA = a[map.year] || albums[a[map.album_id]]?.[albumsMap.year] || 0;
        const yearB = b[map.year] || albums[b[map.album_id]]?.[albumsMap.year] || 0;
        return yearA - yearB;
    };
    const sortByTrack = () => {
        const albums = library.albums;
        const albumsMap = albums.map;
        const discA = albums[a[map.album_id]]?.[albumsMap.disc] || 0;
        const discB = albums[b[map.album_id]]?.[albumsMap.disc] || 0;
        return discA === discB ? a[map.track] - b[map.track] : discA - discB;
    };
    switch (sortBy) {
        case 'title':
            return sortByTitle(a[map.title], b[map.title]) * sortOrder;

        case 'album':
            return sortByAlbum() * sortOrder || sortByTrack();

        case 'artist':
            return sortByArtist() * sortOrder || sortByAlbum() || sortByTrack();

        case 'year':
            return sortByYear() * sortOrder || sortByAlbum() || sortByTrack();

        default:
            return 0;
    }
}

export function sortByTitle(a: string, b: string): number {
    return (a || '').localeCompare(b || '', undefined, {sensitivity: 'base'});
}
