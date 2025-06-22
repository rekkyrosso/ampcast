import {nanoid} from 'nanoid';
import {SetOptional, Writable} from 'type-fest';
import AlbumType from 'types/AlbumType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import PlaybackType from 'types/PlaybackType';
import SortParams from 'types/SortParams';
import Thumbnail from 'types/Thumbnail';
import {Logger, uniq} from 'utils';
import {MAX_DURATION} from 'services/constants';
import SimplePager from 'services/pagers/SimplePager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import plexApi, {PlexRequest, getMusicLibraryId, getMusicLibraryPath} from './plexApi';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';
import PlexPager from './PlexPager';

const logger = new Logger('plexUtils');

export function createMediaObjects<T extends MediaObject>(
    objects: readonly plex.MediaObject[],
    parent?: ParentOf<T>,
    albums: readonly MediaAlbum[] = [],
    childSort?: SortParams,
    noPager?: boolean
): readonly T[] {
    return objects.map((object) => createMediaObject(object, parent, albums, childSort, noPager));
}

export function createMediaObject<T extends MediaObject>(
    object: plex.MediaObject,
    parent?: ParentOf<T>,
    albums: readonly MediaAlbum[] = [],
    childSort?: SortParams,
    noPager?: boolean
): T {
    switch (object.type) {
        case plexItemType.Clip:
            return createMediaItemFromVideo(object) as T;

        case plexItemType.Album:
            return createMediaAlbum(object, noPager) as T;

        case plexItemType.Artist:
            return createMediaArtist(object, noPager, childSort) as T;

        case plexItemType.Playlist:
            if (isRadio(object)) {
                return createRadioItem(object) as T;
            } else {
                return createMediaPlaylist(object, noPager) as T;
            }

        case plexItemType.Track: {
            const album = albums.find((album) => album.src.endsWith(`:${object.parentRatingKey}`));
            return createMediaItemFromTrack(object, album, parent) as T;
        }

        default:
            // TODO: Why is this the default?
            return createMediaFolder(object, parent) as T;
    }
}

export function createMediaItemFromTrack(
    track: plex.Track,
    album?: MediaAlbum | undefined,
    parent?: MediaObject
): MediaItem {
    const media = track.Media?.[0];
    const part = media?.Part?.[0];
    const stream = part?.Stream?.find((stream) => stream.streamType === 2);
    const fileName = getFileName(part?.file) || '[Unknown]';
    const title = (track.title || '').trim() || fileName.replace(/\.\w+/, '');
    const parseNumber = (numeric = ''): number | undefined => {
        const value = parseFloat(numeric);
        return isNaN(value) ? undefined : value;
    };
    album = album || (parent as MediaAlbum);
    if (album?.title === '' || album?.title === '[Unknown Album]') {
        album = undefined;
    }

    return {
        src: getSrc('audio', track),
        srcs: track.Media?.map(({Part: [part]}) => part.key),
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        title,
        fileName,
        description: track.summary,
        externalUrl: getExternalUrl(track),
        addedAt: track.addedAt,
        artists: track.originalTitle
            ? [track.originalTitle]
            : album?.artist
            ? [album.artist]
            : undefined,
        albumArtist: album?.artist,
        album: album?.title,
        duration: track.duration / 1000,
        track: track.index,
        disc: track.parentIndex,
        rating: getRating(track.userRating),
        globalRating: getRating(track.rating),
        year: track.year || track.parentYear,
        playedAt: track.lastViewedAt || 0,
        playCount: track.viewCount,
        genres: getGenres(track) || album?.genres,
        thumbnails: createThumbnails(track.thumb || track.parentThumb || track.grandparentThumb),
        release_mbid: album?.release_mbid,
        track_mbid: getMbid(track),
        unplayable: part ? undefined : true,
        albumGain: album ? parseNumber(stream?.albumGain) : undefined,
        albumPeak: album ? parseNumber(stream?.albumPeak) : undefined,
        trackGain: parseNumber(stream?.gain),
        trackPeak: parseNumber(stream?.peak),
        bitRate: media.bitrate,
        badge: media.audioCodec,
        container: media.container,
        explicit: track.contentRating ? track.contentRating === 'explicit' : undefined,
    };
}

function createMediaAlbum(album: plex.Album, noPager?: boolean): MediaAlbum {
    const {Format: [format] = [], Subformat: [subformat] = []} = album;
    const mediaAlbum = {
        src: getSrc('album', album),
        itemType: ItemType.Album,
        albumType:
            format?.tag === 'EP'
                ? AlbumType.EP
                : format?.tag === 'Single'
                ? AlbumType.Single
                : subformat?.tag === 'Soundtrack'
                ? AlbumType.Soundtrack
                : subformat?.tag === 'Compilation'
                ? AlbumType.Compilation
                : undefined,
        externalUrl: getExternalUrl(album),
        title: album.title || '',
        description: album.summary,
        addedAt: album.addedAt,
        artist: album.parentTitle,
        rating: getRating(album.userRating),
        globalRating: getRating(album.rating),
        year: album.year,
        playedAt: album.lastViewedAt,
        playCount: album.viewCount,
        trackCount: album.leafCount,
        genres: getGenres(album),
        thumbnails: createThumbnails(album.thumb || album.parentThumb),
        release_mbid: getMbid(album),
    };
    if (!noPager) {
        (mediaAlbum as any).pager = createPager(
            {path: album.key},
            undefined,
            mediaAlbum as MediaAlbum
        );
    }
    return mediaAlbum as MediaAlbum;
}

function createMediaArtist(
    artist: plex.Artist,
    noPager?: boolean,
    albumSort?: SortParams
): MediaArtist {
    const mediaArtist = {
        src: getSrc('artist', artist),
        itemType: ItemType.Artist,
        externalUrl: getExternalUrl(artist),
        title: artist.title,
        description: artist.summary,
        country: artist.Country?.map((country) => country.tag).join(', '),
        addedAt: artist.addedAt,
        rating: getRating(artist.userRating),
        globalRating: getRating(artist.rating),
        genres: getGenres(artist),
        thumbnails: createThumbnails(artist.thumb),
        artist_mbid: getMbid(artist),
        synthetic: artist.ratingKey ? undefined : true,
    };
    if (!noPager) {
        (mediaArtist as any).pager = createArtistAlbumsPager(mediaArtist as MediaArtist, albumSort);
    }
    return mediaArtist as MediaArtist;
}

function createMediaItemFromVideo(video: plex.MusicVideo): MediaItem {
    const media = video.Media?.[0];
    const part = media?.Part?.[0];

    return {
        src: getSrc('video', video),
        srcs: video.Media?.map(({Part: [part]}) => part.key),
        itemType: ItemType.Media,
        mediaType: MediaType.Video,
        description: video.summary,
        externalUrl: getExternalUrl(video),
        fileName: getFileName(part?.file),
        title: video.title || 'Video',
        addedAt: video.addedAt,
        artists: video.grandparentTitle ? [video.grandparentTitle] : undefined,
        duration: video.duration / 1000,
        playedAt: video.lastViewedAt || 0,
        playCount: video.viewCount,
        genres: getGenres(video),
        thumbnails: createThumbnails(video.thumb),
        unplayable: part ? undefined : true,
        bitRate: media.bitrate,
        badge: media.videoResolution,
        container: media.container,
        aspectRatio: media.aspectRatio,
        explicit: video.contentRating === 'explicit',
    };
}

function createMediaPlaylist(playlist: plex.Playlist, noPager?: boolean): MediaPlaylist {
    const src = getSrc('playlist', playlist);
    const mediaPlaylist = {
        src,
        itemType: ItemType.Playlist,
        externalUrl: getExternalUrl(playlist),
        title: playlist.title,
        description: playlist.summary,
        addedAt: playlist.addedAt,
        duration: playlist.duration / 1000,
        playedAt: playlist.lastViewedAt,
        playCount: playlist.viewCount,
        trackCount: playlist.leafCount,
        thumbnails: createThumbnails(playlist.thumb || playlist.composite),
        isPinned: pinStore.isPinned(src),
    };
    if (!noPager) {
        (mediaPlaylist as any).pager = createPager({path: playlist.key});
    }
    return mediaPlaylist as MediaPlaylist;
}

function createRadioItem(radio: plex.Radio): MediaItem {
    return {
        src: `plex:radio:${radio.key}`,
        title: radio.title,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: PlaybackType.Direct,
        description: radio.summary,
        duration: MAX_DURATION,
        playedAt: 0,
        skippable: true,
    };
}

function createMediaFolder(folder: plex.Folder, parent?: MediaObject): MediaFolder {
    const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
        itemType: ItemType.Folder,
        src: `plex:folder:${folder.key}`,
        title: folder.title,
        fileName: folder.title,
        path: parent?.itemType === ItemType.Folder ? `${parent.path}/${folder.title}` : '/',
        parentFolder: parent as ParentOf<MediaFolder>,
    };
    mediaFolder.pager = createFolderPager(mediaFolder as MediaFolder, parent);
    return mediaFolder as MediaFolder;
}

export async function getMetadata<T extends plex.MediaObject>(
    objects: readonly T[]
): Promise<readonly T[]> {
    if (objects.length === 0) {
        return [];
    }
    const ratingObjects = objects.filter(
        (object: plex.MediaObject): object is plex.RatingObject => 'ratingKey' in object
    );
    if (ratingObjects.length > 0) {
        // Map of `object.key` to `object`.
        const objectMap: Record<string, T> = objects.reduce((map, object) => {
            map[object.key] = object;
            return map;
        }, {} as Record<string, T>);
        const enhancedObjects = await plexApi.getMetadata(
            ratingObjects.map((object) => object.ratingKey)
        );
        // Update `objectMap` with retrieved values.
        enhancedObjects.forEach((enhancedObject) => {
            objectMap[enhancedObject.key] = enhancedObject as T;
        });
        return objects.map((object) => objectMap[object.key]);
    } else {
        return objects;
    }
}

function getExternalUrl(object: plex.MediaObject): string {
    const host = 'https://app.plex.tv/desktop/#!';
    const clientIdentifier = plexSettings.server?.clientIdentifier;
    const webHost = clientIdentifier ? `${host}/server/${clientIdentifier}` : '';
    const ratingKey = object.ratingKey;
    let key = ratingKey ? `/library/metadata/${ratingKey}` : '';
    let path = 'details';

    switch (object.type) {
        case plexItemType.Clip:
            key = object.art?.replace(/\/art\/\d+$/, '');
            break;

        case plexItemType.Playlist:
            key = ratingKey ? `/playlists/${ratingKey}` : '';
            path = 'playlist';
            break;

        case plexItemType.Track: {
            const parentRatingKey = object.parentRatingKey;
            key = parentRatingKey ? `/library/metadata/${parentRatingKey}` : '';
            break;
        }
    }
    return webHost && key ? `${webHost}/${path}?key=${encodeURIComponent(key)}` : '';
}

function getFileName(path = ''): string | undefined {
    return path.split(/[/\\]/).pop();
}

function getGenres(object: plex.RatingObject): string[] | undefined {
    return object.Genre?.map((genre) => genre.tag);
}

function getMbid(object: plex.RatingObject): string | undefined {
    const guids = object.Guid;
    if (guids) {
        const id = guids.map((guid) => guid.id).find((id) => id.startsWith('mbid://'));
        return id?.replace('mbid://', '');
    }
}

export async function getMediaAlbums(
    items: readonly plex.MediaObject[],
    parent?: MediaObject
): Promise<readonly MediaAlbum[]> {
    const tracks = items.filter((item): item is plex.Track => item.type === 'track');
    const albumKeys = uniq(tracks.map((track) => track.parentRatingKey));
    if (albumKeys.length > 0) {
        if (
            albumKeys.length === 1 &&
            parent?.itemType === ItemType.Album &&
            parent.src.endsWith(`:${albumKeys[0]}`)
        ) {
            return [parent];
        } else {
            const albums = await plexApi.getMetadata<plex.Album>(albumKeys);
            return albums.map((album) => createMediaAlbum(album, true));
        }
    }
    return [];
}

function getRating(rating: number | undefined): number | undefined {
    return typeof rating === 'number' ? (rating || 0) / 2 : undefined;
}

function getSrc(type: string, object: plex.MediaObject): string {
    return `plex:${type}:${object.ratingKey || nanoid()}`;
}

function createThumbnails(thumb: string): Thumbnail[] | undefined {
    return thumb && !thumb.startsWith(`/library/metadata/${getMusicLibraryId()}/`)
        ? [
              createThumbnail(thumb, 240),
              createThumbnail(thumb, 360),
              createThumbnail(thumb, 480),
              createThumbnail(thumb, 800),
          ]
        : undefined;
}

function createThumbnail(thumb: string, width: number, height = width): Thumbnail {
    const url = `${plexSettings.host}/photo/:/transcode?url=${encodeURIComponent(
        thumb
    )}&width=${width}&height=${height}&minSize=1&upscale=1&X-Plex-Token={plex-token}`; // not a typo
    return {url, width, height};
}

function createFolderPager(folder: MediaFolder, parent?: MediaObject): Pager<MediaFolderItem> {
    const [, , key] = folder.src.split(':');
    const folderPager = createPager<MediaFolderItem>({path: key}, {pageSize: 500}, folder);
    if (parent?.itemType === ItemType.Folder) {
        const parentFolder: MediaFolderItem = {
            ...parent,
            fileName: `../${parent.fileName}`,
        };
        const backPager = new SimplePager([parentFolder]);
        return new WrappedPager<MediaFolderItem>(backPager, folderPager);
    } else {
        return folderPager;
    }
}

export function createArtistAlbumsPager(
    artist: MediaArtist,
    albumSort?: SortParams
): Pager<MediaAlbum> {
    const otherTracks = createArtistOtherTracks(artist);
    if (artist.synthetic) {
        const otherTracksPager = new SimplePager<MediaAlbum>([otherTracks]);
        return otherTracksPager;
    } else {
        const createNonEmptyPager = (album: MediaAlbum) =>
            new SimpleMediaPager<MediaAlbum>(async () => {
                try {
                    const items = await fetchFirstPage(album.pager, {keepAlive: true});
                    return items.length === 0 ? [] : [album];
                } catch (err) {
                    logger.error(err);
                    return [];
                }
            });
        const albumsPager = createPager<MediaAlbum>({
            path: getMusicLibraryPath(),
            params: {
                'artist.id': getRatingKey(artist),
                type: plexMediaType.Album,
                sort: albumSort
                    ? `${albumSort.sortBy}:${albumSort.sortOrder === -1 ? 'desc' : 'asc'}`
                    : 'year:desc',
            },
        });
        const videos = createArtistVideos(artist);
        const topPager = createNonEmptyPager(videos);
        const otherTracksPager = createNonEmptyPager(otherTracks);
        return new WrappedPager(topPager, albumsPager, otherTracksPager);
    }
}

function createArtistOtherTracks(artist: MediaArtist): MediaAlbum {
    return {
        itemType: ItemType.Album,
        src: `plex:other-tracks:${getRatingKey(artist)}`,
        title: artist.synthetic ? 'Tracks' : 'Other Tracks',
        artist: artist.title,
        thumbnails: artist.thumbnails,
        pager: createOtherTracksPager(artist),
        trackCount: undefined,
        synthetic: true,
    };
}

function createArtistVideos(artist: MediaArtist): MediaAlbum {
    return {
        itemType: ItemType.Album,
        src: `plex:videos:${getRatingKey(artist)}`,
        title: 'Music Videos',
        artist: artist.title,
        thumbnails: artist.thumbnails,
        pager: createVideosPager(artist),
        trackCount: undefined,
        synthetic: true,
    };
}

function createOtherTracksPager(artist: MediaArtist): Pager<MediaItem> {
    return createPager({
        params: {
            originalTitle: artist.title,
            type: plexMediaType.Track,
        },
    });
}

function createVideosPager(artist: MediaArtist): Pager<MediaItem> {
    return createPager({path: `/library/metadata/${getRatingKey(artist)}/extras`});
}

function createPager<T extends MediaObject>(
    request: Partial<PlexRequest>,
    options?: Partial<PagerConfig>,
    parent?: ParentOf<T>
): Pager<T> {
    return new PlexPager(
        {
            path: getMusicLibraryPath(),
            ...request,
        },
        options,
        parent
    );
}

function isRadio(playlist: plex.Playlist | plex.Radio): playlist is plex.Radio {
    return 'radio' in playlist && playlist.radio === '1';
}

export function getRatingKey({src}: {src: string}): string {
    const [, , ratingKey] = src.split(':');
    return ratingKey;
}
