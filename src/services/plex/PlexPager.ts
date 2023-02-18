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
import Thumbnail from 'types/Thumbnail';
import DualPager from 'services/pagers/DualPager';
import OffsetPager from 'services/pagers/OffsetPager';
import SimplePager from 'services/pagers/SimplePager';
import pinStore from 'services/pins/pinStore';
import {ParentOf} from 'utils';
import plexApi from './plexApi';
import plexSettings from './plexSettings';

type PlexMediaObject = plex.Track | plex.MusicVideo | plex.Album | plex.Artist | plex.Playlist;

export default class PlexPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 1000;

    private readonly pager: Pager<T>;
    private readonly pageSize: number;

    constructor(
        private readonly path: string,
        private readonly params?: Record<string, string>,
        options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        this.pageSize =
            options?.pageSize || (plexSettings.connection?.local ? PlexPager.maxPageSize : 100);
        this.pager = new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), {
            pageSize: this.pageSize,
            ...options,
        });
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
        const result = await plexApi.fetchJSON<plex.MetadataResponse>({
            path: this.path,
            params: this.params,
            headers: {
                'X-Plex-Container-Size': String(this.pageSize),
                'X-Plex-Container-Start': String((pageNumber - 1) * this.pageSize),
            },
        });

        const {
            MediaContainer: {Metadata: tracks = [], size, totalSize},
        } = result;
        const items = tracks.map((track: plex.Track) => this.createItem(track));

        return {items, total: totalSize || size};
    }

    private createItem(item: PlexMediaObject): T {
        switch (item.type) {
            case 'clip':
                return this.createMediaItemFromVideo(item) as T;

            case 'album':
                return this.createMediaAlbum(item) as T;

            case 'artist':
                return this.createMediaArtist(item) as T;

            case 'playlist':
                return this.createMediaPlaylist(item) as T;

            case 'track':
                return this.createMediaItemFromTrack(item) as T;

            default:
                return this.createMediaFolder(item) as T;
        }
    }

    private createMediaItemFromTrack(track: plex.Track): MediaItem {
        const [media] = track.Media;
        const [part] = media.Part;
        const title = (track.title || '').trim();
        const hasMetadata = !!title;
        const albumTitle = hasMetadata
            ? track.parentTitle === '[Unknown Album]'
                ? undefined
                : track.parentTitle || undefined
            : undefined;
        const fileName = this.getFileName(part.file) || '[Unknown]';

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `plex:audio:${part.key}`,
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
            rating: track.userRating || 0,
            year: track.parentYear,
            playedAt: track.lastViewedAt || 0,
            playCount: track.viewCount,
            plex: {
                ratingKey: track.ratingKey,
            },
            thumbnails: this.createThumbnails(track.thumb),
        };
    }

    private createMediaAlbum(album: plex.Album): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `plex:album:${album.ratingKey}`,
            externalUrl: this.getExternalUrl(`/library/metadata/${album.ratingKey}`),
            title: album.title || '',
            description: album.summary,
            addedAt: album.addedAt,
            artist: album.parentTitle,
            rating: album.userRating || 0,
            year: album.year,
            playedAt: album.lastViewedAt,
            playCount: album.viewCount,
            genres: album.Genre?.map((genre) => genre.tag),
            plex: {
                ratingKey: album.ratingKey,
            },
            pager: this.createPager(album.key),
            thumbnails: this.createThumbnails(album.thumb),
        };
    }

    private createMediaArtist(artist: plex.Artist): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: `plex:album:${artist.ratingKey}`,
            externalUrl: this.getExternalUrl(`/library/metadata/${artist.ratingKey}`),
            title: artist.title,
            description: artist.summary,
            country: artist.Country?.map((country) => country.tag).join(', '),
            addedAt: artist.addedAt,
            rating: artist.userRating || 0,
            genres: artist.Genre?.map((genre) => genre.tag),
            plex: {
                ratingKey: artist.ratingKey,
            },
            pager: this.createPager(`/library/sections/${plexSettings.libraryId}/all`, {
                'artist.id': artist.ratingKey,
                type: '9',
                sort: 'year:desc,originallyAvailableAt:desc,artist.titleSort:desc,album.titleSort,album.index',
            }),
            thumbnails: this.createThumbnails(artist.thumb),
        };
    }

    private createMediaItemFromVideo(video: plex.MusicVideo): MediaItem {
        const [media] = video.Media;
        const [part] = media.Part;

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            src: `plex:video:${part.key}`,
            externalUrl: video.art ? this.getExternalUrl(video.art.replace(/\/art\/\d+$/, '')) : '',
            fileName: this.getFileName(part.file),
            title: video.title || 'Video',
            addedAt: video.addedAt,
            artists: video.grandparentTitle ? [video.grandparentTitle] : undefined,
            duration: video.duration / 1000,
            playedAt: video.lastViewedAt || 0,
            playCount: video.viewCount,
            plex: {
                ratingKey: video.ratingKey,
            },
            thumbnails: this.createThumbnails(video.thumb),
        };
    }

    private createMediaPlaylist(playlist: plex.Playlist): MediaPlaylist {
        const src = `plex:playlist:${playlist.key}`;

        return {
            itemType: ItemType.Playlist,
            src: src,
            externalUrl: this.getExternalUrl(`/playlists/${playlist.ratingKey}`, 'playlist'),
            title: playlist.title,
            description: playlist.summary,
            addedAt: playlist.addedAt,
            duration: playlist.duration / 1000,
            playedAt: playlist.lastViewedAt,
            playCount: playlist.viewCount,
            trackCount: playlist.leafCount,
            plex: {
                ratingKey: playlist.ratingKey,
            },
            pager: this.createPager(playlist.key),
            thumbnails: this.createThumbnails(playlist.composite),
            isPinned: pinStore.isPinned(src),
        };
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

    private get webHost(): string {
        const clientIdentifier = plexSettings.server?.clientIdentifier;
        return clientIdentifier ? `https://app.plex.tv/desktop/#!/server/${clientIdentifier}` : '';
    }

    private getExternalUrl(key: string, path = 'details'): string {
        const webHost = this.webHost;
        return webHost ? `${webHost}/${path}?key=${encodeURIComponent(key)}` : '';
    }

    private getFileName(path: string): string | undefined {
        return path.split(/[/\\]/).pop();
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

    private createPager<T extends MediaObject>(
        key: string,
        params?: Record<string, string>
    ): Pager<T> {
        return new PlexPager<T>(key, params);
    }

    private createFolderPager(folder: MediaFolder): Pager<MediaFolderItem> {
        const [, , key] = folder.src.split(':');
        const folderPager = new PlexPager<MediaFolderItem>(key, undefined, undefined, folder);
        if (this.parent?.itemType === ItemType.Folder) {
            const parentFolder: MediaFolderItem = {
                ...this.parent,
                fileName: `../${this.parent.fileName}`,
            };
            const backPager = new SimplePager([parentFolder]);
            return new DualPager<MediaFolderItem>(backPager, folderPager);
        } else {
            return folderPager;
        }
    }
}
