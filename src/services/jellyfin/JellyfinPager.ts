import type {Observable} from 'rxjs';
import type {BaseItemDto} from '@jellyfin/client-axios/dist/models';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import OffsetPager from 'services/OffsetPager';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';

export default class JellyfinPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 100;
    static maxPageSize = 1000;

    private readonly pager: Pager<T>;
    private readonly pageSize = JellyfinPager.minPageSize;

    constructor(
        private readonly path: string,
        private readonly params: Record<string, string> = {}
    ) {
        this.pager = new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), {
            pageSize: this.pageSize,
        });
    }

    observeComplete(): Observable<readonly T[]> {
        return this.pager.observeComplete();
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeMaxSize(): Observable<number> {
        return this.pager.observeMaxSize();
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
        const params = {
            IncludeItemTypes: 'Audio',
            Fields: 'AudioInfo,Genres',
            Recursive: 'true',
            ImageTypeLimit: '1',
            EnableImageTypes: 'Primary',
            ...this.params,
            Limit: String(this.pageSize),
            StartIndex: String((pageNumber - 1) * this.pageSize),
        };

        const response = await jellyfinApi.get(this.path, params);

        if (!response.ok) {
            throw Error(`${response.status}: ${response.statusText}`);
        }

        const {Items: tracks, TotalRecordCount: total} = await response.json();
        const items = tracks.map((track: BaseItemDto) => this.createItem(track));

        return {items, total};
    }

    private createItem(item: BaseItemDto): T {
        switch (item.Type) {
            case 'MusicArtist':
                return this.createMediaArtist(item) as T;

            case 'MusicAlbum':
                return this.createMediaAlbum(item) as T;

            case 'Playlist':
                return this.createMediaPlaylist(item) as T;

            default:
                return this.createMediaItemFromTrack(item) as T;
        }
    }

    private createMediaArtist(artist: BaseItemDto): MediaArtist {
        console.log('createMediaItemFromArtist', artist);
        return {
            itemType: ItemType.Artist,
            src: `jellyfin:album:${artist.Id}`,
            title: artist.Name || '',
            genre: artist.Genres?.join(';'),
            thumbnails: this.createThumbnails(artist.Id),
            pager: this.createAlbumsPager(artist),
        };
    }

    private createMediaAlbum(album: BaseItemDto): MediaAlbum {
        console.log('createMediaItemFromAlbum', album);
        return {
            itemType: ItemType.Album,
            src: `jellyfin:album:${album.Id}`,
            title: album.Name || '',
            duration: album.RunTimeTicks ? album.RunTimeTicks / 10_000_000 : 0,
            playedAt: album.UserData?.LastPlayedDate
                ? Math.floor(new Date(album.UserData.LastPlayedDate).getTime() / 1000)
                : undefined,
            playCount: album.UserData?.PlayCount || undefined,
            genre: album.Genres?.join(';'),
            thumbnails: this.createThumbnails(album.Id),
            trackCount: album.ChildCount || undefined,
            pager: this.createAlbumPager(album),
            artist: album.AlbumArtist || undefined,
            year: album.ProductionYear || undefined,
        };
    }

    private createMediaPlaylist(playlist: BaseItemDto): MediaPlaylist {
        return {
            itemType: ItemType.Playlist,
            src: `jellyfin:playlist:${playlist.Id}`,
            title: playlist.Name || '',
            duration: playlist.RunTimeTicks ? playlist.RunTimeTicks / 10_000_000 : 0,
            playedAt: playlist.UserData?.LastPlayedDate
                ? Math.floor(new Date(playlist.UserData.LastPlayedDate).getTime() / 1000)
                : undefined,
            playCount: playlist.UserData?.PlayCount || undefined,
            genre: playlist.Genres?.join(';'),
            thumbnails: this.createThumbnails(playlist.Id),
            trackCount: playlist.ChildCount || undefined,
            pager: this.createPlaylistPager(playlist),
        };
    }

    private createMediaItemFromTrack(track: BaseItemDto): MediaItem {
        const thumbnailId = track.ImageTags?.Primary ? track.Id : track.AlbumId;

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `jellyfin:audio:${track.Id}`,
            title: track.Name || '',
            duration: track.RunTimeTicks ? track.RunTimeTicks / 10_000_000 : 0,
            year: track.ProductionYear || undefined,
            playedAt: track.UserData?.LastPlayedDate
                ? Math.floor(new Date(track.UserData.LastPlayedDate).getTime() / 1000)
                : 0,
            playCount: track.UserData?.PlayCount || undefined,
            genre: track.Genres?.join(';'),
            thumbnails: this.createThumbnails(thumbnailId),
            artist: track.Artists?.join('/') || track.AlbumArtist || undefined,
            albumArtist: track.AlbumArtist || undefined,
            album: track.Album || undefined,
            track: track.Album ? track.IndexNumber || 0 : 0,
        };
    }

    private createThumbnails(thumbnailId: string | null | undefined): Thumbnail[] | undefined {
        return thumbnailId
            ? [
                  this.createThumbnail(thumbnailId, 60),
                  this.createThumbnail(thumbnailId, 120),
                  this.createThumbnail(thumbnailId, 240),
                  this.createThumbnail(thumbnailId, 480),
              ]
            : undefined;
    }

    private createThumbnail(trackId: string, width: number, height = width): Thumbnail {
        const url = `${jellyfinSettings.host}/Items/${trackId}/Images/Primary?fillWidth=${width}&fillHeight=${height}`;
        return {url, width, height};
    }

    private createAlbumPager(album: BaseItemDto): Pager<MediaItem> {
        return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, {
            ParentId: album.Id!,
            SortBy: 'SortName',
            SortOrder: 'Ascending',
        });
    }

    private createAlbumsPager(artist: BaseItemDto): Pager<MediaAlbum> {
        return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, {
            AlbumArtistIds: artist.Id!,
            IncludeItemTypes: 'MusicAlbum',
            SortOrder: 'Descending',
        });
    }

    private createPlaylistPager(playlist: BaseItemDto): Pager<MediaItem> {
        return new JellyfinPager(`Playlists/${playlist.Id}/Items`, {
            UserId: jellyfinSettings.userId,
            MediaType: 'Audio',
            Fields: 'ChildCount',
        });
    }
}
