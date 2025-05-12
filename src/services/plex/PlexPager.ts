import type {Observable} from 'rxjs';
import {Subscription, mergeMap} from 'rxjs';
import {nanoid} from 'nanoid';
import {SetOptional, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import Thumbnail from 'types/Thumbnail';
import {Logger, uniq} from 'utils';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import OffsetPager from 'services/pagers/OffsetPager';
import SimplePager from 'services/pagers/SimplePager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import plexApi, {PlexRequest, getMusicLibraryId, getMusicLibraryPath} from './plexApi';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';

const logger = new Logger('PlexPager');

export default class PlexPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static plexMaxPageSize = 1000;

    private readonly pager: OffsetPager<T>;
    readonly pageSize: number;
    private subscriptions?: Subscription;

    constructor(
        private readonly request: PlexRequest,
        private readonly options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        let pageSize = options?.pageSize;
        if (!pageSize) {
            pageSize = plexSettings.connection?.local ? PlexPager.plexMaxPageSize : 200;
        }
        this.pageSize = Math.min(options?.maxSize || Infinity, pageSize);
        const config = {...options, pageSize: this.pageSize};
        this.pager = new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), config);
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeBusy(): Observable<boolean> {
        return this.pager.observeBusy();
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
        this.subscriptions?.unsubscribe();
    }

    fetchAt(index: number, length: number): void {
        if (!this.subscriptions) {
            this.connect();
        }

        this.pager.fetchAt(index, length);
    }

    private get isLookup(): boolean {
        return !!this.options?.lookup;
    }

    private get isSearch(): boolean {
        const {path, params} = this.request;
        return (
            path.endsWith('/all') &&
            !!(params?.title || params?.originalTitle) &&
            params.type !== plexMediaType.Playlist &&
            !params.extraType
        );
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            // Items from the `/search` endpoints are already enhanced.
            if (!this.isLookup) {
                this.subscriptions.add(
                    this.pager
                        .observeAdditions()
                        .pipe(mergeMap((items) => this.enhanceItems(items)))
                        .subscribe(logger)
                );
            }
        }
    }

    private async enhanceItems(items: readonly T[]): Promise<void> {
        items = items.filter(
            (item) =>
                item.itemType === ItemType.Album ||
                (item.itemType === ItemType.Media && item.mediaType !== MediaType.Video)
        );
        if (items.length > 0) {
            const plexObjects = await plexApi.getMetadata(
                items.map(({src}): string => {
                    const [, , ratingKey] = src.split(':');
                    return ratingKey;
                })
            );
            const albums = await this.getMediaAlbums(plexObjects);
            const enhancedItems = plexObjects.map((object: plex.MediaObject) =>
                this.createMediaObject(object, albums, true)
            );
            dispatchMediaObjectChanges<MediaObject>(
                enhancedItems.map((item) => ({
                    match: (object: MediaObject) => object.src === item.src,
                    values: item,
                }))
            );
        }
    }

    private async fetch(pageNumber: number): Promise<Page<T>> {
        const {headers, ...rest} = this.request;
        const request = {
            ...rest,
            headers: {
                ...headers,
                'X-Plex-Container-Size': String(this.pageSize),
                'X-Plex-Container-Start': String((pageNumber - 1) * this.pageSize),
            },
        };
        let plexItems: readonly plex.MediaObject[];
        let albums: readonly MediaAlbum[] = [];
        let total = 0;
        if (this.isSearch && pageNumber === 1) {
            const page = await plexApi.search(request);
            plexItems = page.items;
            total = page.total || plexItems.length;
        } else {
            const {
                MediaContainer: {Metadata = [], size, totalSize},
            } = await plexApi.fetchJSON<plex.MetadataResponse>(request);
            plexItems = Metadata;
            total = totalSize || size;
        }
        if (this.isLookup) {
            [plexItems, albums] = await Promise.all([
                plexApi.getMetadata(plexItems.map((item) => item.ratingKey)),
                this.getMediaAlbums(plexItems),
            ]);
        }
        const items = plexItems.map((item: plex.MediaObject) =>
            this.createMediaObject(item, albums)
        );
        return {items, total};
    }

    private createMediaObject(
        object: plex.MediaObject,
        albums: readonly MediaAlbum[],
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
                return this.createMediaPlaylist(object, noPager) as T;

            case plexItemType.Track: {
                const album = albums.find((album) =>
                    album.src.endsWith(`:${object.parentRatingKey}`)
                );
                return this.createMediaItemFromTrack(object, album) as T;
            }

            default:
                return this.createMediaFolder(object) as T;
        }
    }

    private createMediaItemFromTrack(track: plex.Track, album: MediaAlbum | undefined): MediaItem {
        const media = track.Media?.[0];
        const part = media?.Part?.[0];
        const stream = part?.Stream?.find((stream) => stream.streamType === 2);
        const fileName = this.getFileName(part?.file) || '[Unknown]';
        const title = (track.title || '').trim() || fileName.replace(/\.\w+/, '');
        const parseNumber = (numeric = ''): number | undefined => {
            const value = parseFloat(numeric);
            return isNaN(value) ? undefined : value;
        };
        album = album || (this.parent as MediaAlbum);

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
    }

    private createMediaAlbum(album: plex.Album, noPager?: boolean): MediaAlbum {
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
    }

    private createMediaArtist(artist: plex.Artist, noPager?: boolean): MediaArtist {
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
    }

    private createMediaItemFromVideo(video: plex.MusicVideo): MediaItem {
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
    }

    private createMediaPlaylist(playlist: plex.Playlist, noPager?: boolean): MediaPlaylist {
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
    }

    private createMediaFolder(folder: plex.Folder): MediaFolder {
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `plex:folder:${folder.key}`,
            title: folder.title,
            fileName: folder.title,
            path:
                this.parent?.itemType === ItemType.Folder
                    ? `${this.parent.path}/${folder.title}`
                    : '/',
            parent: this.parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder);
        return mediaFolder as MediaFolder;
    }

    private getExternalUrl(object: plex.MediaObject): string {
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

    private getFileName(path = ''): string | undefined {
        return path.split(/[/\\]/).pop();
    }

    private getGenres(object: plex.RatingObject): string[] | undefined {
        return object.Genre?.map((genre) => genre.tag);
    }

    private getMbid(object: plex.RatingObject): string | undefined {
        const guids = object.Guid;
        if (guids) {
            const id = guids.map((guid) => guid.id).find((id) => id.startsWith('mbid://'));
            return id?.replace('mbid://', '');
        }
    }

    private async getMediaAlbums(
        items: readonly plex.MediaObject[]
    ): Promise<readonly MediaAlbum[]> {
        const tracks = items.filter((item): item is plex.Track => item.type === 'track');
        const albumKeys = uniq(tracks.map((track) => track.parentRatingKey));
        if (albumKeys.length > 0) {
            if (
                albumKeys.length === 1 &&
                this.parent?.itemType === ItemType.Album &&
                this.parent.src.endsWith(`:${albumKeys[0]}`)
            ) {
                return [this.parent];
            } else {
                const albums = await plexApi.getMetadata<plex.Album>(albumKeys);
                return albums.map((album) => this.createMediaAlbum(album, true));
            }
        }
        return [];
    }

    private getRating(rating: number | undefined): number | undefined {
        return typeof rating === 'number' ? Math.round((rating || 0) / 2) : undefined;
    }

    private getSrc(type: string, object: plex.MediaObject): string {
        return `plex:${type}:${object.ratingKey || nanoid()}`;
    }

    private createThumbnails(thumb: string): Thumbnail[] | undefined {
        return thumb && !thumb.startsWith(`/library/metadata/${getMusicLibraryId()}/`)
            ? [
                  this.createThumbnail(thumb, 240),
                  this.createThumbnail(thumb, 360),
                  this.createThumbnail(thumb, 480),
                  this.createThumbnail(thumb, 800),
              ]
            : undefined;
    }

    private createThumbnail(thumb: string, width: number, height = width): Thumbnail {
        const url = `${plexSettings.host}/photo/:/transcode?url=${encodeURIComponent(
            thumb
        )}&width=${width}&height=${height}&minSize=1&upscale=1&X-Plex-Token={plex-token}`; // not a typo
        return {url, width, height};
    }

    private createFolderPager(folder: MediaFolder): Pager<MediaFolderItem> {
        const [, , key] = folder.src.split(':');
        const folderPager = this.createPager<MediaFolderItem>(
            {path: key},
            {pageSize: this.pageSize},
            folder
        );
        if (this.parent?.itemType === ItemType.Folder) {
            const parentFolder: MediaFolderItem = {
                ...this.parent,
                fileName: `../${this.parent.fileName}`,
            };
            const backPager = new SimplePager([parentFolder]);
            return new WrappedPager<MediaFolderItem>(backPager, folderPager);
        } else {
            return folderPager;
        }
    }

    private createArtistAlbumsPager(artist: plex.Artist): Pager<MediaAlbum> {
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
    }

    private createArtistOtherTracks(artist: plex.Artist): MediaAlbum {
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
    }

    private createArtistVideos(artist: plex.Artist): MediaAlbum {
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
    }

    private createOtherTracksPager(artist: plex.Artist): Pager<MediaItem> {
        return this.createPager({
            params: {
                originalTitle: artist.title,
                type: plexMediaType.Track,
            },
        });
    }

    private createVideosPager(artist: plex.Artist): Pager<MediaItem> {
        return this.createPager({path: `/library/metadata/${artist.ratingKey}/extras`});
    }

    private createPager<T extends MediaObject>(
        request: Partial<PlexRequest>,
        options?: Partial<PagerConfig>,
        parent?: ParentOf<T>
    ): Pager<T> {
        return new PlexPager(
            {
                ...this.request,
                params: undefined,
                ...request,
            },
            options,
            parent
        );
    }
}
