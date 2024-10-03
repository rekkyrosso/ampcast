import type {Observable} from 'rxjs';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import OffsetPager from 'services/pagers/OffsetPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import {getTextFromHtml} from 'utils';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';

export default class NavidromePager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    private readonly pager: OffsetPager<T>;
    private readonly pageSize: number;

    constructor(
        private readonly itemType: ItemType,
        private readonly path: string,
        private readonly params?: Record<string, Primitive>,
        options?: Partial<PagerConfig>
    ) {
        this.pageSize = options?.pageSize || 200;
        this.pager = new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), {
            pageSize: this.pageSize,
            ...options,
        });
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
    }

    fetchAt(index: number, length: number): void {
        this.pager.fetchAt(index, length);
    }

    private async fetch(pageNumber: number): Promise<Page<T>> {
        const _start = (pageNumber - 1) * this.pageSize;
        const _end = _start + this.pageSize;
        const {items, total} = await navidromeApi.getPage<Navidrome.MediaObject>(this.path, {
            ...this.params,
            _start,
            _end,
        });
        return {
            items: items.map((item) => this.createMediaObject(item)),
            total,
        };
    }

    private createMediaObject(item: Navidrome.MediaObject): T {
        let mediaObject: T;
        switch (this.itemType) {
            case ItemType.Album:
                mediaObject = this.createMediaAlbum(item as Navidrome.Album) as T;
                break;

            case ItemType.Artist:
                mediaObject = this.createMediaArtist(item as Navidrome.Artist) as T;
                break;

            case ItemType.Playlist:
                mediaObject = this.createMediaPlaylist(item as Navidrome.Playlist) as T;
                break;

            default:
                mediaObject = this.createMediaItem(item as Navidrome.Song) as T;
                break;
        }
        return mediaObject;
    }

    private createMediaItem(song: Navidrome.Song): MediaItem {
        const id = song.mediaFileId || song.id;
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `navidrome:audio:${id}`,
            externalUrl: this.getExternalUrl(`album/${song.albumId}`),
            title: song.title,
            addedAt: this.parseDate(song.createdAt),
            artists: [song.artist],
            albumArtist: song.albumArtist,
            album: song.album,
            duration: song.duration,
            track: song.trackNumber,
            disc: song.discNumber,
            inLibrary: song.starred,
            year: song.year,
            playedAt: this.parseDate(song.playDate),
            playCount: song.playCount,
            genres: song.genres?.map((genre) => genre.name),
            thumbnails: this.createThumbnails(song.albumId),
            recording_mbid: song.mbzTrackId,
            release_mbid: song.mbzAlbumId,
            track_mbid: song.mbzReleaseTrackId,
            artist_mbids: song.mbzArtistId ? [song.mbzArtistId] : undefined,
        };
    }

    private createMediaAlbum(album: Navidrome.Album): MediaAlbum {
        const album_id = album.id;
        return {
            itemType: ItemType.Album,
            src: `navidrome:album:${album_id}`,
            externalUrl: this.getExternalUrl(`album/${album_id}`),
            title: album.name,
            addedAt: this.parseDate(album.createdAt),
            artist: album.albumArtist,
            inLibrary: album.starred,
            year: album.minYear || album.maxYear,
            playedAt: this.parseDate(album.playDate),
            playCount: album.playCount,
            genres: album.genres?.map((genre) => genre.name),
            pager: new NavidromePager(ItemType.Media, 'song', {album_id, _sort: 'album'}),
            thumbnails: this.createThumbnails(album_id),
            release_mbid: album.mbzAlbumId,
            artist_mbids: album.mbzAlbumArtistId ? [album.mbzAlbumArtistId] : undefined,
        };
    }

    private createMediaArtist(artist: Navidrome.Artist): MediaArtist {
        const artist_id = artist.id;
        const hasThumbnails = Object.keys(artist).some((key) => /ImageUrl$/.test(key));
        return {
            itemType: ItemType.Artist,
            src: `navidrome:artist:${artist_id}`,
            externalUrl: this.getExternalUrl(`artist/${artist_id}`),
            title: artist.name,
            description: getTextFromHtml(artist.biography) || undefined,
            inLibrary: artist.starred,
            genres: artist.genres?.map((genre) => genre.name),
            pager: this.createArtistAlbumsPager(artist),
            thumbnails: hasThumbnails ? this.createThumbnails(artist_id) : undefined,
            artist_mbid: artist.mbzArtistId,
        };
    }

    private createMediaPlaylist(playlist: Navidrome.Playlist): MediaPlaylist {
        const playlist_id = playlist.id;
        const src = `navidrome:playlist:${playlist_id}`;

        return {
            itemType: ItemType.Playlist,
            src: src,
            externalUrl: this.getExternalUrl(`playlist/${playlist_id}`),
            title: playlist.name,
            description: getTextFromHtml(playlist.comment),
            addedAt: this.parseDate(playlist.createdAt),
            duration: playlist.duration,
            trackCount: playlist.songCount,
            pager: new NavidromePager(ItemType.Media, `playlist/${playlist_id}/tracks`, {
                playlist_id,
            }),
            thumbnails: this.createThumbnails(playlist_id),
            isPinned: pinStore.isPinned(src),
            isOwn: playlist.ownerId === navidromeSettings.userId,
            owner: {
                name: playlist.ownerName,
            },
        };
    }

    private getExternalUrl(id: string): string {
        return `${navidromeSettings.host}/app/#/${id}/show`;
    }

    private parseDate(date: string): number {
        const time = Date.parse(date) || 0;
        return time < 0 ? 0 : Math.round(time / 1000);
    }

    private createThumbnails(id: string): Thumbnail[] | undefined {
        return id
            ? [
                  this.createThumbnail(id, 240),
                  this.createThumbnail(id, 360),
                  this.createThumbnail(id, 480),
                  this.createThumbnail(id, 800),
              ]
            : undefined;
    }

    private createThumbnail(id: string, width: number, height = width): Thumbnail {
        const {host} = navidromeSettings;
        const url = `${host}/rest/getCoverArt?id=${id}&size=${width}&{navidrome-credentials}`; // not a typo
        return {url, width, height};
    }

    private createArtistAlbumsPager(artist: Navidrome.Artist): Pager<MediaAlbum> {
        const allTracks = this.createArtistAllTracks(artist);
        const allTracksPager = new SimplePager<MediaAlbum>([allTracks]);
        const albumsPager = new NavidromePager<MediaAlbum>(ItemType.Album, 'album', {
            album_artist_id: artist.id,
            _sort: 'minYear',
            _order: 'DESC',
        });
        return new WrappedPager(undefined, albumsPager, allTracksPager);
    }

    private createArtistAllTracks(artist: Navidrome.Artist): MediaAlbum {
        const hasThumbnails = Object.keys(artist).some((key) => /ImageUrl$/.test(key));
        return {
            itemType: ItemType.Album,
            src: `navidrome:all-tracks:${artist.id}`,
            title: 'All Songs',
            artist: artist.name,
            thumbnails: hasThumbnails ? this.createThumbnails(artist.id) : undefined,
            pager: this.createAllTracksPager(artist),
            synthetic: true,
        };
    }

    private createAllTracksPager(artist: Navidrome.Artist): Pager<MediaItem> {
        return new NavidromePager<MediaItem>(ItemType.Media, 'song', {
            artist: artist.name,
            _sort: 'title',
        });
    }
}
