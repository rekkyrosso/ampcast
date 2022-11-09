import type {Observable} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import OffsetPager from 'services/OffsetPager';
import plexSettings from './plexSettings';
import plexApi from './plexApi';

type PlexMediaObject = plex.Track | plex.MusicVideo | plex.Album | plex.Artist | plex.Playlist;

export default class PlexPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 100;
    static maxPageSize = 1000;

    private readonly pager: Pager<T>;
    private readonly pageSize = plexSettings.connection?.local
        ? PlexPager.maxPageSize
        : PlexPager.minPageSize;

    constructor(private readonly path: string, private readonly params?: Record<string, string>) {
        this.pager = new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), {
            pageSize: this.pageSize,
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
            MediaContainer: {Metadata: tracks = [], totalSize: total},
        } = result;
        const items = tracks.map((track: plex.Track) => this.createItem(track));

        return {items, total};
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

            default:
                return this.createMediaItemFromTrack(item) as T;
        }
    }

    private createMediaItemFromTrack(track: plex.Track): MediaItem {
        const [media] = track.Media;
        const [part] = media.Part;
        const albumTitle = track.parentTitle === '[Unknown Album]' ? '' : track.parentTitle || '';

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `plex:audio:${part.key}`,
            title: track.title,
            addedAt: track.addedAt,
            artist: track.grandparentTitle,
            albumArtist: albumTitle ? track.grandparentTitle : undefined,
            album: albumTitle,
            duration: track.duration / 1000,
            track: albumTitle ? track.index : undefined,
            rating: track.userRating,
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
            title: album.title || '',
            addedAt: album.addedAt,
            artist: album.parentTitle,
            rating: album.userRating,
            year: album.year,
            playedAt: album.lastViewedAt,
            playCount: album.viewCount,
            genre: album.Genre?.map((genre) => genre.tag).join(';'),
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
            title: artist.title,
            addedAt: artist.addedAt,
            rating: artist.userRating,
            genre: artist.Genre?.map((genre) => genre.tag).join(';'),
            plex: {
                ratingKey: artist.ratingKey,
            },
            pager: this.createPager(artist.key),
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
            title: video.title || 'Video',
            addedAt: video.addedAt,
            artist: video.grandparentTitle,
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
        return {
            itemType: ItemType.Playlist,
            src: `plex:playlist:${playlist.key}`,
            title: playlist.title,
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
        };
    }

    private createThumbnails(thumb: string): Thumbnail[] | undefined {
        return thumb
            ? [
                  this.createThumbnail(thumb, 60),
                  this.createThumbnail(thumb, 120),
                  this.createThumbnail(thumb, 240),
                  this.createThumbnail(thumb, 480),
              ]
            : undefined;
    }

    private createThumbnail(thumb: string, width: number, height = width): Thumbnail {
        const url = `${plexSettings.host}/photo/:/transcode?url=${encodeURIComponent(
            thumb
        )}&width=${width}&height=${height}&minSize=1&upscale=1&X-Plex-Token={plex-token}`;
        return {url, width, height};
    }

    private createPager<T extends MediaObject>(key: string): Pager<T> {
        return new PlexPager<T>(key);
    }
}
