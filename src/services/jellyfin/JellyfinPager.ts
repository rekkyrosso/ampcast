import type {Observable} from 'rxjs';
import type {BaseItemDto} from '@jellyfin/client-axios/dist/models';
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
import OffsetPager from 'services/pagers/OffsetPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import ratingStore from 'services/actions/ratingStore';
import pinStore from 'services/pins/pinStore';
import {ParentOf} from 'utils';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import jellyfin from './jellyfin';

export default class JellyfinPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    private readonly pager: Pager<T>;
    private readonly pageSize: number;

    constructor(
        private readonly path: string,
        private readonly params: Record<string, unknown> = {},
        options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
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
        const params = {
            IncludeItemTypes: 'Audio',
            Fields: 'AudioInfo,Genres,Path',
            EnableUserData: true,
            Recursive: true,
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary',
            EnableTotalRecordCount: true,
            ...this.params,
            Limit: String(this.pageSize),
            StartIndex: String((pageNumber - 1) * this.pageSize),
        };

        const data = await jellyfinApi.get(this.path, params);

        if ((data as BaseItemDto).Type) {
            return {
                items: [this.createMediaObject(data as BaseItemDto)],
                total: 1,
            };
        } else {
            return {
                items: data.Items?.map((item: BaseItemDto) => this.createMediaObject(item)) || [],
                total: data.TotalRecordCount || data.Items?.length,
            };
        }
    }

    private createMediaObject(item: BaseItemDto): T {
        if (this.parent?.itemType === ItemType.Folder && item.IsFolder) {
            return this.createMediaFolder(item) as T;
        } else {
            let mediaObject: T;
            switch (item.Type) {
                case 'MusicArtist':
                    mediaObject = this.createMediaArtist(item) as T;
                    break;

                case 'MusicAlbum':
                    mediaObject = this.createMediaAlbum(item) as T;
                    break;

                case 'Playlist':
                    mediaObject = this.createMediaPlaylist(item) as T;
                    break;

                default:
                    mediaObject = this.createMediaItem(item) as T;
            }
            if (jellyfin.canRate(mediaObject)) {
                (mediaObject as Writable<T>).rating = this.getRating(mediaObject, item);
            }
            return mediaObject;
        }
    }

    private createMediaArtist(artist: BaseItemDto): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: `jellyfin:artist:${artist.Id}`,
            externalUrl: this.getExternalUrl(artist),
            title: artist.Name || '',
            playCount: artist.UserData?.PlayCount || undefined,
            genres: artist.Genres || undefined,
            thumbnails: this.createThumbnails(artist),
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createMediaAlbum(album: BaseItemDto): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `jellyfin:album:${album.Id}`,
            externalUrl: this.getExternalUrl(album),
            title: album.Name || '',
            duration: album.RunTimeTicks ? album.RunTimeTicks / 10_000_000 : 0,
            playedAt: album.UserData?.LastPlayedDate
                ? Math.floor(new Date(album.UserData.LastPlayedDate).getTime() / 1000)
                : undefined,
            playCount: album.UserData?.PlayCount || undefined,
            genres: album.Genres || undefined,
            thumbnails: this.createThumbnails(album),
            trackCount: album.ChildCount || undefined,
            pager: this.createAlbumTracksPager(album),
            artist: album.AlbumArtist || undefined,
            year: album.ProductionYear || undefined,
        };
    }

    private createMediaPlaylist(playlist: BaseItemDto): MediaPlaylist {
        const src = `jellyfin:playlist:${playlist.Id}`;
        return {
            src,
            itemType: ItemType.Playlist,
            externalUrl: this.getExternalUrl(playlist),
            title: playlist.Name || '',
            duration: playlist.RunTimeTicks ? playlist.RunTimeTicks / 10_000_000 : 0,
            playedAt: playlist.UserData?.LastPlayedDate
                ? Math.floor(new Date(playlist.UserData.LastPlayedDate).getTime() / 1000)
                : undefined,
            playCount: playlist.UserData?.PlayCount || undefined,
            genres: playlist.Genres || undefined,
            thumbnails: this.createThumbnails(playlist),
            trackCount: playlist.ChildCount || undefined,
            pager: this.createPlaylistPager(playlist),
            isPinned: pinStore.isPinned(src),
        };
    }

    private createMediaFolder(folder: BaseItemDto): MediaFolder {
        const fileName = this.getFileName(folder.Path || '') || folder.Name || '[unknown]';
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `jellyfin:folder:${folder.Id}`,
            title: folder.Name || '[unknown]',
            fileName,
            path:
                this.parent?.itemType === ItemType.Folder ? `${this.parent.path}/${fileName}` : '/',
            parent: this.parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder);
        return mediaFolder as MediaFolder;
    }

    private createMediaItem(track: BaseItemDto): MediaItem {
        const isVideo = track.MediaType === 'Video';
        return {
            itemType: ItemType.Media,
            mediaType: isVideo ? MediaType.Video : MediaType.Audio,
            src: `jellyfin:${isVideo ? 'video' : 'audio'}:${track.Id}`,
            externalUrl: this.getExternalUrl(track),
            fileName: this.getFileName(track.Path || '') || track.Name || '[unknown]',
            title: track.Name || '',
            duration: track.RunTimeTicks ? track.RunTimeTicks / 10_000_000 : 0,
            year: track.ProductionYear || undefined,
            playedAt: track.UserData?.LastPlayedDate
                ? Math.floor(new Date(track.UserData.LastPlayedDate).getTime() / 1000)
                : 0,
            playCount: track.UserData?.PlayCount || undefined,
            genres: track.Genres || undefined,
            thumbnails: this.createThumbnails(track),
            artists: track.Artists?.length
                ? track.Artists
                : track.AlbumArtist
                ? [track.AlbumArtist]
                : undefined,
            albumArtist: track.AlbumArtist || undefined,
            album: track.Album || undefined,
            disc: track.Album ? track.ParentIndexNumber || undefined : undefined,
            track: track.Album ? track.IndexNumber || 0 : 0,
        };
    }

    private createThumbnails(item: BaseItemDto): Thumbnail[] | undefined {
        const thumbnailId = item.ImageTags?.Primary ? item.Id : item.AlbumId;
        return thumbnailId
            ? [
                  this.createThumbnail(thumbnailId, 120),
                  this.createThumbnail(thumbnailId, 240),
                  this.createThumbnail(thumbnailId, 360),
                  this.createThumbnail(thumbnailId, 480),
              ]
            : undefined;
    }

    private createThumbnail(id: string, width: number, height = width): Thumbnail {
        const url = `${jellyfinSettings.host}/Items/${id}/Images/Primary?fillWidth=${width}&fillHeight=${height}`;
        return {url, width, height};
    }

    private createAlbumTracksPager(album: BaseItemDto): Pager<MediaItem> {
        return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, {
            ParentId: album.Id!,
            SortBy: 'SortName',
            SortOrder: 'Ascending',
        });
    }

    private createArtistAlbumsPager(artist: BaseItemDto): Pager<MediaAlbum> {
        const allTracks = this.createArtistAllTracks(artist);
        const allTracksPager = new SimplePager<MediaAlbum>([allTracks]);
        const albumsPager = new JellyfinPager<MediaAlbum>(
            `Users/${jellyfinSettings.userId}/Items`,
            {
                AlbumArtistIds: artist.Id!,
                IncludeItemTypes: 'MusicAlbum',
                SortBy: 'ProductionYear,SortName',
                SortOrder: 'Descending,Ascending',
            }
        );
        return new WrappedPager(undefined, albumsPager, allTracksPager);
    }

    private createArtistAllTracks(artist: BaseItemDto): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `jellyfin:all-tracks:${artist.Id}`,
            title: 'All Songs',
            artist: artist.Name || '',
            thumbnails: this.createThumbnails(artist),
            pager: this.createAllTracksPager(artist),
            synthetic: true,
        };
    }

    private createAllTracksPager(artist: BaseItemDto): Pager<MediaItem> {
        return new JellyfinPager<MediaItem>(`Users/${jellyfinSettings.userId}/Items`, {
            ArtistIds: artist.Id!,
            IncludeItemTypes: 'Audio',
            SortBy: 'Name',
            SortOrder: 'Ascending',
        });
    }

    private createPlaylistPager(playlist: BaseItemDto): Pager<MediaItem> {
        return new JellyfinPager(`Playlists/${playlist.Id}/Items`, {
            UserId: jellyfinSettings.userId,
            MediaType: 'Audio',
            Fields: 'ChildCount',
        });
    }

    private createFolderPager(folder: MediaFolder): Pager<MediaFolderItem> {
        const [, , id] = folder.src.split(':');
        const folderPager = new JellyfinPager<MediaFolderItem>(
            `Users/${jellyfinSettings.userId}/Items`,
            {
                ParentId: id,
                IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio,MusicVideo',
                Fields: 'AudioInfo,Genres,UserData,ParentId,Path',
                EnableUserData: true,
                Recursive: false,
                SortBy: 'IsFolder,IndexNumber,SortName',
                SortOrder: 'Ascending',
            },
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

    private getExternalUrl(item: BaseItemDto): string {
        return `${jellyfinSettings.host}/web/index.html#!/details?id=${item.Id}&serverId=${jellyfinSettings.serverId}`;
    }

    private getFileName(path: string): string | undefined {
        return path.split(/[/\\]/).pop();
    }

    private getRating(object: T, item: BaseItemDto): number | undefined {
        const userData = item.UserData;
        return ratingStore.get(object, userData ? (userData.IsFavorite ? 1 : 0) : undefined);
    }
}
