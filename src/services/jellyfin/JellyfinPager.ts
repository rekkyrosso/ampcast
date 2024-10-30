import type {Observable} from 'rxjs';
import type {BaseItemDto} from '@jellyfin/sdk/lib/generated-client/models';
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
import {uniq} from 'utils';
import OffsetPager from 'services/pagers/OffsetPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';

type LegacyBaseItemDto = BaseItemDto & {LUFS?: number | null};

export default class JellyfinPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 1000;

    private readonly pager: OffsetPager<T>;
    private readonly pageSize: number;

    constructor(
        private readonly path: string,
        private readonly params: Record<string, unknown> = {},
        options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        this.pageSize = Math.min(
            options?.maxSize || Infinity,
            options?.pageSize || (jellyfinSettings.isLocal ? JellyfinPager.maxPageSize : 200)
        );
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
        const params = {
            IncludeItemTypes: 'Audio',
            Fields: 'AudioInfo,ChildCount,DateCreated,Genres,MediaSources,Path,ProviderIds',
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
        const page = (data as BaseItemDto).Type
            ? {
                  items: [data as BaseItemDto],
                  total: 1,
              }
            : {
                  items: data.Items || [],
                  total: data.TotalRecordCount || data.Items?.length,
              };
        const albums = await this.getAlbums(page.items);
        return {...page, items: page.items.map((item) => this.createMediaObject(item, albums))};
    }

    private createMediaObject(item: BaseItemDto, albums: readonly BaseItemDto[]): T {
        if (this.parent?.itemType === ItemType.Folder && item.IsFolder) {
            return this.createMediaFolder(item) as T;
        } else {
            switch (item.Type) {
                case 'MusicArtist':
                    return this.createMediaArtist(item) as T;

                case 'MusicAlbum':
                    return this.createMediaAlbum(item) as T;

                case 'Playlist':
                    return this.createMediaPlaylist(item) as T;

                default: {
                    const album = albums.find((album) => album.Id === item.AlbumId);
                    return this.createMediaItem(item, album) as T;
                }
            }
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
            inLibrary: artist.UserData?.IsFavorite,
            artist_mbid: artist.ProviderIds?.MusicBrainzArtist ?? undefined,
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
            inLibrary: album.UserData?.IsFavorite,
            trackCount: album.ChildCount || undefined,
            pager: this.createAlbumTracksPager(album),
            artist: album.AlbumArtist || undefined,
            release_mbid: album.ProviderIds?.MusicBrainzAlbum ?? undefined,
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
            inLibrary: playlist.UserData?.IsFavorite,
            trackCount: playlist.ChildCount || undefined,
            pager: this.createPlaylistItemsPager(playlist),
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

    private createMediaItem(
        track: LegacyBaseItemDto,
        album?: LegacyBaseItemDto | undefined
    ): MediaItem {
        const isVideo = track.MediaType === 'Video';
        const [source] = track.MediaSources || [];
        const artist_mbid = track.ProviderIds?.MusicBrainzArtist;
        const getGain = (item: LegacyBaseItemDto | undefined): number | undefined => {
            return item?.NormalizationGain ?? (item?.LUFS == null ? undefined : -18 - item.LUFS);
        };
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
            inLibrary: track.UserData?.IsFavorite,
            artists: track.Artists?.length
                ? track.Artists
                : track.AlbumArtist
                ? [track.AlbumArtist]
                : undefined,
            albumArtist: track.AlbumArtist || undefined,
            album: track.Album || undefined,
            disc: track.Album ? track.ParentIndexNumber || undefined : undefined,
            track: track.Album ? track.IndexNumber || 0 : 0,
            track_mbid: track.ProviderIds?.MusicBrainzTrack ?? undefined,
            release_mbid: track.ProviderIds?.MusicBrainzAlbum ?? undefined,
            artist_mbids: artist_mbid ? [artist_mbid] : undefined,
            albumGain: isVideo ? undefined : getGain(album),
            trackGain: isVideo ? undefined : getGain(track),
            bitRate: Math.floor((source?.Bitrate || 0) / 1000) || undefined,
            badge: isVideo
                ? track.IsHD === true
                    ? 'hd'
                    : track.IsHD === false
                    ? 'sd'
                    : undefined
                : track.Container || undefined,
        };
    }

    private createThumbnails(item: BaseItemDto): Thumbnail[] | undefined {
        const thumbnailId = item.ImageTags?.Primary ? item.Id : item.AlbumId;
        return thumbnailId
            ? [
                  this.createThumbnail(thumbnailId, 240),
                  this.createThumbnail(thumbnailId, 360),
                  this.createThumbnail(thumbnailId, 480),
                  this.createThumbnail(thumbnailId, 800),
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

    private createPlaylistItemsPager(playlist: BaseItemDto): Pager<MediaItem> {
        return new JellyfinPager(`Playlists/${playlist.Id}/Items`, {
            UserId: jellyfinSettings.userId,
            MediaType: 'Audio',
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

    private async getAlbums(items: readonly BaseItemDto[]): Promise<readonly BaseItemDto[]> {
        const tracks = items.filter((item) => item.Type === 'Audio');
        const albumIds = uniq(tracks.map((track) => track.AlbumId));
        if (albumIds.length > 0) {
            const data = await jellyfinApi.get(`Users/${jellyfinSettings.userId}/Items`, {
                Ids: albumIds.join(','),
                IncludeItemTypes: 'MusicAlbum',
                Limit: String(albumIds.length),
            });
            return data.Items || [];
        }
        return [];
    }

    private getExternalUrl(item: BaseItemDto): string {
        return `${jellyfinSettings.host}/web/index.html#!/details?id=${item.Id}&serverId=${jellyfinSettings.serverId}`;
    }

    private getFileName(path: string): string | undefined {
        return path.split(/[/\\]/).pop();
    }
}
