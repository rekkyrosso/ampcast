import type {Observable} from 'rxjs';
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
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import OffsetPager from 'services/pagers/OffsetPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import {Logger, ParentOf} from 'utils';
import plexApi, {PlexRequest, getMusicLibraryPath, musicProviderHost} from './plexApi';
import plexItemType from './plexItemType';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';

const logger = new Logger('PlexPager');

export interface PlexPagerConfig extends PagerConfig {
    serviceId?: 'plex' | 'plex-tidal';
}

export default class PlexPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static plexMaxPageSize = 1000;
    static tidalMaxPageSize = 100;

    private readonly pager: Pager<T>;
    private readonly pageSize: number;
    private readonly serviceId: 'plex' | 'plex-tidal';
    private pageNumber = 1;

    constructor(
        private readonly request: PlexRequest,
        options?: Partial<PlexPagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        this.serviceId = options?.serviceId || 'plex';
        const isTidal = this.serviceId === 'plex-tidal';
        let pageSize = options?.pageSize;
        if (!pageSize) {
            if (isTidal) {
                pageSize = 50;
            } else {
                pageSize = plexSettings.connection?.local ? PlexPager.plexMaxPageSize : 200;
            }
        }
        this.pageSize = Math.min(options?.maxSize || Infinity, pageSize);
        const config = {...options, pageSize: this.pageSize};
        this.pager = isTidal
            ? new SequentialPager<T>(() => this.fetchNext(), config)
            : new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), config);
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
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
    }

    fetchAt(index: number, length: number): void {
        this.pager.fetchAt(index, length);
    }

    private async fetch(pageNumber: number): Promise<Page<T>> {
        const path = this.request.path;
        if (path.endsWith('/search')) {
            const plexItems = await plexApi.search(this.request);
            const items = plexItems.map((item) => this.createMediaObject(item));
            const total = items.length;
            return {items, total};
        } else {
            const {headers, ...request} = this.request;
            const result = await plexApi.fetchJSON<plex.MetadataResponse>({
                ...request,
                headers: {
                    ...headers,
                    'X-Plex-Container-Size': String(this.pageSize),
                    'X-Plex-Container-Start': String((pageNumber - 1) * this.pageSize),
                },
            });

            const {
                MediaContainer: {Metadata = [], size, totalSize},
            } = result;

            let plexItems = Metadata;

            if (path.endsWith('/tidal/myMixes')) {
                // The playlists from this response all have a `leafCount` of `1`.
                // And they have the wrong `title`.
                plexItems = plexItems.map((item, index) => {
                    if (item.type === 'playlist' && item.leafCount === 1) {
                        return {
                            ...item,
                            leafCount: undefined,
                            title: `My Mix ${index + 1}`,
                            summary: item.title,
                        };
                    }
                    return item;
                }) as plex.MediaObject[];
            }

            const items = plexItems.map((item: plex.MediaObject) => this.createMediaObject(item));

            return {items, total: totalSize || size};
        }
    }

    private async fetchNext(): Promise<Page<T>> {
        const page = await this.fetch(this.pageNumber);
        this.pageNumber++;
        return page;
    }

    private createMediaObject(item: plex.MediaObject): T {
        switch (item.type) {
            case plexItemType.Clip:
                return this.createMediaItemFromVideo(item) as T;

            case plexItemType.Album:
                return this.createMediaAlbum(item) as T;

            case plexItemType.Artist:
                return this.createMediaArtist(item) as T;

            case plexItemType.Playlist:
                return this.createMediaPlaylist(item) as T;

            case plexItemType.Track:
                return this.createMediaItemFromTrack(item) as T;

            default:
                return this.createMediaFolder(item) as T;
        }
    }

    private createMediaItemFromTrack(track: plex.Track): MediaItem {
        const [media] = track.Media || [];
        const [part] = media?.Part || [];
        const title = (track.title || '').trim();
        const hasMetadata = !!title;
        const albumTitle = hasMetadata
            ? track.parentTitle === '[Unknown Album]'
                ? undefined
                : track.parentTitle || undefined
            : undefined;
        const fileName = this.getFileName(part?.file) || '[Unknown]';
        const isTidal = this.serviceId === 'plex-tidal';

        return {
            src: `${this.serviceId}:audio:${track.ratingKey}`,
            srcs: track.Media?.map(({Part: [part]}) => part.key),
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            playbackType: isTidal ? PlaybackType.DASH : undefined,
            externalUrl: this.getExternalUrl(`/library/metadata/${track.parentRatingKey}`),
            fileName: fileName,
            title: title || fileName.replace(/\.\w+/, ''),
            addedAt: track.addedAt,
            artists: hasMetadata
                ? track.originalTitle
                    ? [track.originalTitle]
                    : track.grandparentTitle
                    ? [track.grandparentTitle]
                    : undefined
                : undefined,
            albumArtist: albumTitle && !track.originalTitle ? track.grandparentTitle : undefined,
            album: albumTitle,
            duration: track.duration / 1000,
            track: albumTitle ? track.index : undefined,
            disc: albumTitle && track.index ? track.parentIndex : undefined,
            inLibrary: this.getInLibrary(track),
            rating: this.getRating(track),
            globalRating: track.rating,
            year: track.year || track.parentYear,
            playedAt: track.lastViewedAt || 0,
            playCount: track.viewCount,
            genres: track.Genre?.map((genre) => genre.tag),
            thumbnails: this.createThumbnails(
                (isTidal ? undefined : track.thumb) || track.parentThumb || track.grandparentThumb
            ),
            unplayable: part ? undefined : true,
        };
    }

    private createMediaAlbum(album: plex.Album): MediaAlbum {
        return {
            src: `${this.serviceId}:album:${album.ratingKey}`,
            itemType: ItemType.Album,
            externalUrl: this.getExternalUrl(`/library/metadata/${album.ratingKey}`),
            title: album.title || '',
            description: album.summary,
            addedAt: album.addedAt,
            artist: album.parentTitle,
            inLibrary: this.getInLibrary(album),
            rating: this.getRating(album),
            globalRating: album.rating,
            year: album.year,
            playedAt: album.lastViewedAt,
            playCount: album.viewCount,
            genres: album.Genre?.map((genre) => genre.tag),
            pager: this.createPager({path: album.key}),
            thumbnails: this.createThumbnails(album.thumb || album.parentThumb),
        };
    }

    private createMediaArtist(artist: plex.Artist): MediaArtist {
        return {
            src: `${this.serviceId}:artist:${artist.ratingKey}`,
            itemType: ItemType.Artist,
            externalUrl: this.getExternalUrl(`/library/metadata/${artist.ratingKey}`),
            title: artist.title,
            description: artist.summary,
            country: artist.Country?.map((country) => country.tag).join(', '),
            addedAt: artist.addedAt,
            inLibrary: this.getInLibrary(artist),
            rating: this.getRating(artist),
            globalRating: artist.rating,
            genres: artist.Genre?.map((genre) => genre.tag),
            pager: this.createArtistAlbumsPager(artist),
            thumbnails: this.createThumbnails(artist.thumb),
        };
    }

    private createMediaItemFromVideo(video: plex.MusicVideo): MediaItem {
        const [media] = video.Media || [];
        const [part] = media?.Part || [];

        return {
            src: `${this.serviceId}:video:${video.ratingKey}`,
            srcs: video.Media?.map(({Part: [part]}) => part.key),
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            playbackType: this.serviceId === 'plex-tidal' ? PlaybackType.HLS : undefined,
            externalUrl: video.art ? this.getExternalUrl(video.art.replace(/\/art\/\d+$/, '')) : '',
            fileName: this.getFileName(part?.file),
            title: video.title || 'Video',
            addedAt: video.addedAt,
            artists: video.grandparentTitle ? [video.grandparentTitle] : undefined,
            duration: video.duration / 1000,
            playedAt: video.lastViewedAt || 0,
            playCount: video.viewCount,
            genres: video.Genre?.map((genre) => genre.tag),
            inLibrary: this.getInLibrary(video),
            thumbnails: this.createThumbnails(video.thumb),
            unplayable: part ? undefined : true,
        };
    }

    private createMediaPlaylist(playlist: plex.Playlist): MediaPlaylist {
        const src = `${this.serviceId}:playlist:${playlist.ratingKey}`;

        return {
            src,
            itemType: ItemType.Playlist,
            externalUrl: this.getExternalUrl(`/playlists/${playlist.ratingKey}`, 'playlist'),
            title: playlist.title,
            description: playlist.summary,
            addedAt: playlist.addedAt,
            duration: playlist.duration / 1000,
            playedAt: playlist.lastViewedAt,
            playCount: playlist.viewCount,
            trackCount: playlist.leafCount,
            pager: this.createPager({path: playlist.key}),
            thumbnails: this.createThumbnails(playlist.thumb || playlist.composite),
            isPinned: pinStore.isPinned(src),
        };
    }

    private createMediaFolder(folder: plex.Folder): MediaFolder {
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `${this.serviceId}:folder:${folder.key}`,
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

    private get webHost(): string {
        const host = 'https://app.plex.tv/desktop/#!';
        if (this.serviceId === 'plex-tidal') {
            return `${host}/provider/tv.plex.provider.music`;
        } else {
            const clientIdentifier = plexSettings.server?.clientIdentifier;
            return clientIdentifier ? `${host}/server/${clientIdentifier}` : '';
        }
    }

    private getExternalUrl(key: string, path = 'details'): string {
        const webHost = this.webHost;
        return webHost ? `${webHost}/${path}?key=${encodeURIComponent(key)}` : '';
    }

    private getFileName(path = ''): string | undefined {
        return path.split(/[/\\]/).pop();
    }

    private getInLibrary(object: plex.MusicObject): boolean | undefined {
        return this.serviceId === 'plex-tidal' ? object.saved : undefined;
    }

    private getRating(object: plex.MusicObject): number | undefined {
        return this.serviceId === 'plex' ? Math.round((object.userRating || 0) / 2) : undefined;
    }

    private createThumbnails(thumb: string): Thumbnail[] | undefined {
        return thumb
            ? [
                  this.createThumbnail(thumb, 120),
                  this.createThumbnail(thumb, 240),
                  this.createThumbnail(thumb, 360),
                  this.createThumbnail(thumb, 480),
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
        if (this.serviceId === 'plex-tidal') {
            const albumsPager = this.createPager<MediaAlbum>({path: artist.key});
            const topTracks = this.createArtistTopTracks(artist);
            const videos = this.createArtistVideos(artist);
            const topPager = new SimpleMediaPager<MediaAlbum>(async () => {
                try {
                    const items = await fetchFirstPage(videos.pager, {keepAlive: true});
                    return items.length === 0 ? [topTracks] : [topTracks, videos];
                } catch (err) {
                    logger.error(err);
                    return [topTracks];
                }
            });
            return new WrappedPager(topPager, albumsPager);
        } else {
            const albumsPager = this.createPager<MediaAlbum>({
                path: getMusicLibraryPath(),
                params: {
                    'artist.id': artist.ratingKey,
                    type: plexMediaType.Album,
                    sort: 'year:desc,originallyAvailableAt:desc,artist.titleSort:desc,album.titleSort,album.index',
                },
            });
            const otherTracks = this.createArtistOtherTracks(artist);
            const otherTracksPager = new SimplePager<MediaAlbum>([otherTracks]);
            return new WrappedPager(undefined, albumsPager, otherTracksPager);
        }
    }

    private createArtistOtherTracks(artist: plex.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:other-tracks:${artist.ratingKey}`,
            title: 'Other Tracks',
            artist: artist.title,
            thumbnails: this.createThumbnails(artist.thumb),
            pager: this.createOtherTracksPager(artist),
            synthetic: true,
        };
    }

    private createArtistTopTracks(artist: plex.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:top-tracks:${artist.ratingKey}`,
            title: 'Top Tracks',
            artist: artist.title,
            thumbnails: this.createThumbnails(artist.thumb),
            pager: this.createTopTracksPager(artist),
            synthetic: true,
        };
    }

    private createArtistVideos(artist: plex.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.serviceId}:videos:${artist.ratingKey}`,
            title: 'Music Videos',
            artist: artist.title,
            thumbnails: this.createThumbnails(artist.thumb),
            pager: this.createVideosPager(artist),
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

    private createTopTracksPager(artist: plex.Artist): Pager<MediaItem> {
        return this.createPager(
            {path: `/library/metadata/${artist.ratingKey}/popular`},
            {maxSize: 20}
        );
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
                host: this.serviceId === 'plex-tidal' ? musicProviderHost : request.host,
            },
            {...options, serviceId: this.serviceId},
            parent
        );
    }
}
