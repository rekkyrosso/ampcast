import {nanoid} from 'nanoid';
import {SetOptional, Writable} from 'type-fest';
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
import Thumbnail from 'types/Thumbnail';
import {Logger, uniq} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {dispatchMetadataChanges} from 'services/metadata';
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

const plexUtils = {
    createMediaObjects<T extends MediaObject>(
        objects: readonly plex.MediaObject[],
        parent?: ParentOf<T>,
        albums: readonly MediaAlbum[] = [],
        noPager?: boolean
    ): readonly T[] {
        return objects.map((object) => this.createMediaObject(object, parent, albums, noPager));
    },

    createMediaObject<T extends MediaObject>(
        object: plex.MediaObject,
        parent?: ParentOf<T>,
        albums: readonly MediaAlbum[] = [],
        noPager?: boolean
    ): T {
        switch (object.type) {
            case plexItemType.Clip:
                return this.createMediaItemFromVideo(object) as T;

            case plexItemType.Album:
                return this.createMediaAlbum(object, noPager) as T;

            case plexItemType.Artist:
                return this.createMediaArtist(object, noPager) as T;

            case plexItemType.Playlist:
                if (this.isRadio(object)) {
                    return this.createRadioItem(object) as T;
                } else {
                    return this.createMediaPlaylist(object, noPager) as T;
                }

            case plexItemType.Track: {
                const album = albums.find((album) =>
                    album.src.endsWith(`:${object.parentRatingKey}`)
                );
                return this.createMediaItemFromTrack(object, album, parent) as T;
            }

            default:
                // TODO: Why is this the default?
                return this.createMediaFolder(object, parent) as T;
        }
    },

    createMediaItemFromTrack(
        track: plex.Track,
        album?: MediaAlbum | undefined,
        parent?: MediaObject
    ): MediaItem {
        const media = track.Media?.[0];
        const part = media?.Part?.[0];
        const stream = part?.Stream?.find((stream) => stream.streamType === 2);
        const fileName = this.getFileName(part?.file) || '[Unknown]';
        const title = (track.title || '').trim() || fileName.replace(/\.\w+/, '');
        const parseNumber = (numeric = ''): number | undefined => {
            const value = parseFloat(numeric);
            return isNaN(value) ? undefined : value;
        };
        album = album || (parent as MediaAlbum);

        return {
            src: this.getSrc('audio', track),
            srcs: track.Media?.map(({Part: [part]}) => part.key),
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            title,
            fileName,
            description: track.summary,
            externalUrl: this.getExternalUrl(track),
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
            rating: this.getRating(track.userRating),
            globalRating: this.getRating(track.rating),
            year: track.year || track.parentYear,
            playedAt: track.lastViewedAt || 0,
            playCount: track.viewCount,
            genres: this.getGenres(track) || album?.genres,
            thumbnails: this.createThumbnails(
                track.thumb || track.parentThumb || track.grandparentThumb
            ),
            release_mbid: album?.release_mbid,
            track_mbid: this.getMbid(track),
            unplayable: part ? undefined : true,
            albumGain: parseNumber(stream?.albumGain),
            albumPeak: parseNumber(stream?.albumPeak),
            trackGain: parseNumber(stream?.gain),
            trackPeak: parseNumber(stream?.peak),
            bitRate: media.bitrate,
            badge: media.audioCodec,
            container: media.container,
            explicit: track.contentRating ? track.contentRating === 'explicit' : undefined,
        };
    },

    createMediaAlbum(album: plex.Album, noPager?: boolean): MediaAlbum {
        const mediaAlbum = {
            src: this.getSrc('album', album),
            itemType: ItemType.Album,
            externalUrl: this.getExternalUrl(album),
            title: album.title || '',
            description: album.summary,
            addedAt: album.addedAt,
            artist: album.parentTitle,
            rating: this.getRating(album.userRating),
            globalRating: this.getRating(album.rating),
            year: album.year,
            playedAt: album.lastViewedAt,
            playCount: album.viewCount,
            trackCount: album.leafCount,
            genres: this.getGenres(album),
            thumbnails: this.createThumbnails(album.thumb || album.parentThumb),
            release_mbid: this.getMbid(album),
        };
        if (!noPager) {
            (mediaAlbum as any).pager = this.createPager(
                {path: album.key},
                undefined,
                mediaAlbum as MediaAlbum
            );
        }
        return mediaAlbum as MediaAlbum;
    },

    createMediaArtist(artist: plex.Artist, noPager?: boolean): MediaArtist {
        const mediaArtist = {
            src: this.getSrc('artist', artist),
            itemType: ItemType.Artist,
            externalUrl: this.getExternalUrl(artist),
            title: artist.title,
            description: artist.summary,
            country: artist.Country?.map((country) => country.tag).join(', '),
            addedAt: artist.addedAt,
            rating: this.getRating(artist.userRating),
            globalRating: this.getRating(artist.rating),
            genres: this.getGenres(artist),
            thumbnails: this.createThumbnails(artist.thumb),
            artist_mbid: this.getMbid(artist),
            synthetic: artist.ratingKey ? undefined : true,
        };
        if (!noPager) {
            (mediaArtist as any).pager = this.createArtistAlbumsPager(artist);
        }
        return mediaArtist as MediaArtist;
    },

    createMediaItemFromVideo(video: plex.MusicVideo): MediaItem {
        const media = video.Media?.[0];
        const part = media?.Part?.[0];

        return {
            src: this.getSrc('video', video),
            srcs: video.Media?.map(({Part: [part]}) => part.key),
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            description: video.summary,
            externalUrl: this.getExternalUrl(video),
            fileName: this.getFileName(part?.file),
            title: video.title || 'Video',
            addedAt: video.addedAt,
            artists: video.grandparentTitle ? [video.grandparentTitle] : undefined,
            duration: video.duration / 1000,
            playedAt: video.lastViewedAt || 0,
            playCount: video.viewCount,
            genres: this.getGenres(video),
            thumbnails: this.createThumbnails(video.thumb),
            unplayable: part ? undefined : true,
            bitRate: media.bitrate,
            badge: media.videoResolution,
            container: media.container,
            aspectRatio: media.aspectRatio,
            explicit: video.contentRating === 'explicit',
        };
    },

    createMediaPlaylist(playlist: plex.Playlist, noPager?: boolean): MediaPlaylist {
        const src = this.getSrc('playlist', playlist);
        const mediaPlaylist = {
            src,
            itemType: ItemType.Playlist,
            externalUrl: this.getExternalUrl(playlist),
            title: playlist.title,
            description: playlist.summary,
            addedAt: playlist.addedAt,
            duration: playlist.duration / 1000,
            playedAt: playlist.lastViewedAt,
            playCount: playlist.viewCount,
            trackCount: playlist.leafCount,
            thumbnails: this.createThumbnails(playlist.thumb || playlist.composite),
            isPinned: pinStore.isPinned(src),
        };
        if (!noPager) {
            (mediaPlaylist as any).pager = this.createPager({path: playlist.key});
        }
        return mediaPlaylist as MediaPlaylist;
    },

    createRadioItem(radio: plex.Radio): MediaItem {
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
    },

    createMediaFolder(folder: plex.Folder, parent?: MediaObject): MediaFolder {
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `plex:folder:${folder.key}`,
            title: folder.title,
            fileName: folder.title,
            path: parent?.itemType === ItemType.Folder ? `${parent.path}/${folder.title}` : '/',
            parentFolder: parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder, parent);
        return mediaFolder as MediaFolder;
    },

    async enhanceItems<T extends MediaObject>(
        items: readonly T[],
        parent?: ParentOf<T>
    ): Promise<void> {
        items = items.filter(
            (item) =>
                item.itemType === ItemType.Album ||
                (item.itemType === ItemType.Media &&
                    item.mediaType !== MediaType.Video &&
                    item.linearType !== LinearType.Station)
        );
        if (items.length > 0) {
            const plexObjects = await plexApi.getMetadata(
                items.map(({src}): string => {
                    const [, , ratingKey] = src.split(':');
                    return ratingKey;
                })
            );
            const albums = await plexUtils.getMediaAlbums(plexObjects);
            const enhancedItems = plexObjects.map((object: plex.MediaObject) =>
                plexUtils.createMediaObject(object, parent, albums, true)
            );
            dispatchMetadataChanges<T>(
                enhancedItems.map((item) => ({
                    match: (object: MediaObject) => object.src === item.src,
                    values: item,
                }))
            );
        }
    },

    getExternalUrl(object: plex.MediaObject): string {
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
    },

    getFileName(path = ''): string | undefined {
        return path.split(/[/\\]/).pop();
    },

    getGenres(object: plex.RatingObject): string[] | undefined {
        return object.Genre?.map((genre) => genre.tag);
    },

    getMbid(object: plex.RatingObject): string | undefined {
        const guids = object.Guid;
        if (guids) {
            const id = guids.map((guid) => guid.id).find((id) => id.startsWith('mbid://'));
            return id?.replace('mbid://', '');
        }
    },

    async getMediaAlbums(
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
                return albums.map((album) => this.createMediaAlbum(album, true));
            }
        }
        return [];
    },

    getRating(rating: number | undefined): number | undefined {
        return typeof rating === 'number' ? Math.round((rating || 0) / 2) : undefined;
    },

    getSrc(type: string, object: plex.MediaObject): string {
        return `plex:${type}:${object.ratingKey || nanoid()}`;
    },

    createThumbnails(thumb: string): Thumbnail[] | undefined {
        return thumb && !thumb.startsWith(`/library/metadata/${getMusicLibraryId()}/`)
            ? [
                  this.createThumbnail(thumb, 240),
                  this.createThumbnail(thumb, 360),
                  this.createThumbnail(thumb, 480),
                  this.createThumbnail(thumb, 800),
              ]
            : undefined;
    },

    createThumbnail(thumb: string, width: number, height = width): Thumbnail {
        const url = `${plexSettings.host}/photo/:/transcode?url=${encodeURIComponent(
            thumb
        )}&width=${width}&height=${height}&minSize=1&upscale=1&X-Plex-Token={plex-token}`; // not a typo
        return {url, width, height};
    },

    createFolderPager(folder: MediaFolder, parent?: MediaObject): Pager<MediaFolderItem> {
        const [, , key] = folder.src.split(':');
        const folderPager = this.createPager<MediaFolderItem>({path: key}, {pageSize: 500}, folder);
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
    },

    createArtistAlbumsPager(artist: plex.Artist): Pager<MediaAlbum> {
        const otherTracks = this.createArtistOtherTracks(artist);
        if (artist.ratingKey) {
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
            const albumsPager = this.createPager<MediaAlbum>({
                path: getMusicLibraryPath(),
                params: {
                    'artist.id': artist.ratingKey,
                    type: plexMediaType.Album,
                    sort: 'year:desc,originallyAvailableAt:desc,artist.titleSort:desc,album.titleSort,album.index',
                },
            });
            const videos = this.createArtistVideos(artist);
            const topPager = createNonEmptyPager(videos);
            const otherTracksPager = createNonEmptyPager(otherTracks);
            return new WrappedPager(topPager, albumsPager, otherTracksPager);
        } else {
            const otherTracksPager = new SimplePager<MediaAlbum>([otherTracks]);
            return otherTracksPager;
        }
    },

    createArtistOtherTracks(artist: plex.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: this.getSrc('other-tracks', artist),
            title: artist.ratingKey ? 'Other Tracks' : 'Tracks',
            artist: artist.title,
            thumbnails: this.createThumbnails(artist.thumb),
            pager: this.createOtherTracksPager(artist),
            trackCount: undefined,
            synthetic: true,
        };
    },

    createArtistVideos(artist: plex.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: this.getSrc('videos', artist),
            title: 'Music Videos',
            artist: artist.title,
            thumbnails: this.createThumbnails(artist.thumb),
            pager: this.createVideosPager(artist),
            trackCount: undefined,
            synthetic: true,
        };
    },

    createOtherTracksPager(artist: plex.Artist): Pager<MediaItem> {
        return this.createPager({
            params: {
                originalTitle: artist.title,
                type: plexMediaType.Track,
            },
        });
    },

    createVideosPager(artist: plex.Artist): Pager<MediaItem> {
        return this.createPager({path: `/library/metadata/${artist.ratingKey}/extras`});
    },

    createPager<T extends MediaObject>(
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
    },

    isRadio(playlist: plex.Playlist | plex.Radio): playlist is plex.Radio {
        return 'radio' in playlist && playlist.radio === '1';
    },
};

export default plexUtils;
