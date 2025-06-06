import unidecode from 'unidecode';
import type {Observable} from 'rxjs';
import type {BaseItemDto} from '@jellyfin/sdk/lib/generated-client/models';
import {Primitive, SetOptional, Writable} from 'type-fest';
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
import {uniqBy} from 'utils';
import OffsetPager from 'services/pagers/OffsetPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import embySettings from './embySettings';
import embyApi from './embyApi';

export default class EmbyPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    private readonly pager: Pager<T>;
    readonly pageSize: number;

    constructor(
        private readonly path: string,
        private readonly params: Record<string, Primitive> = {},
        private readonly options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        this.pageSize = Math.min(
            options?.maxSize || Infinity,
            options?.pageSize || (embySettings.isLocal ? EmbyPager.maxPageSize : 200)
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

    private get isLookup(): boolean {
        return !!this.options?.lookup;
    }

    private async fetch(pageNumber: number): Promise<Page<T>> {
        const params = {
            ...this.getParams(),
            ...this.params,
            Limit: this.pageSize,
            StartIndex: (pageNumber - 1) * this.pageSize,
        };
        let page = await this.getPage(this.path, params);
        if (
            this.params.SearchTerm &&
            !this.isLookup &&
            pageNumber === 1 &&
            /Audio|MusicAlbum/.test(this.params.IncludeItemTypes as string) &&
            page.items.length < this.pageSize
        ) {
            // Fetch enhanced results if we have fewer items than the page size.
            page = await this.fetchMoreSearchItems(page.items);
        }
        return {...page, items: page.items.map((item) => this.createMediaObject(item))};
    }

    private async fetchMoreSearchItems(
        initialItems: readonly BaseItemDto[]
    ): Promise<Page<BaseItemDto>> {
        const path = `Users/${embySettings.userId}/Items`;
        const params = {
            ...this.getParams(),
            ParentId: embySettings.libraryId,
        };
        const itemType = this.params.IncludeItemTypes;
        const query = this.params.SearchTerm as string;
        let items: readonly BaseItemDto[] = initialItems;
        // Fetch underlying artists.
        const page = await this.getPage(path, {
            ...params,
            SearchTerm: query,
            IncludeItemTypes: 'MusicArtist',
            Limit: 50,
        });
        const artistIds = page.items.map((artist) => artist.Id).join(',');
        if (itemType === 'Audio') {
            // Fetch artist tracks.
            const page = await this.getPage(path, {
                ...params,
                ArtistIds: artistIds,
                IncludeItemTypes: 'Audio',
                Limit: this.pageSize,
            });
            items = uniqBy('Id', initialItems.concat(page.items));
        } else if (itemType === 'MusicAlbum') {
            // Fetch artist albums.
            const decode = (name: string) => unidecode(name).toLowerCase();
            const decodedQuery = decode(query);
            const page = await this.getPage(path, {
                ...params,
                ArtistIds: artistIds,
                IncludeItemTypes: 'MusicAlbum',
                Limit: this.pageSize,
            });
            items = uniqBy(
                'Id',
                initialItems.concat(
                    page.items.filter((album) =>
                        decode(album.AlbumArtist || '').includes(decodedQuery)
                    )
                )
            );
        }
        return {items, total: items.length, atEnd: true};
    }

    private createMediaObject(item: BaseItemDto): T {
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

                default:
                    return this.createMediaItem(item) as T;
            }
        }
    }

    private createMediaArtist(artist: BaseItemDto): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: `emby:artist:${artist.Id}`,
            externalUrl: this.getExternalUrl(artist),
            title: artist.Name || '',
            description: artist.Overview || undefined,
            playCount: artist.UserData?.PlayCount || undefined,
            genres: artist.Genres || undefined,
            inLibrary: artist.UserData?.IsFavorite,
            thumbnails: this.createThumbnails(artist),
            artist_mbid: artist.ProviderIds?.MusicBrainzArtist ?? undefined,
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createMediaAlbum(album: BaseItemDto): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `emby:album:${album.Id}`,
            externalUrl: this.getExternalUrl(album),
            title: album.Name || '',
            description: album.Overview ?? undefined,
            duration: album.RunTimeTicks ? album.RunTimeTicks / 10_000_000 : 0,
            addedAt: this.parseDate(album.DateCreated),
            playedAt: this.parseDate(album.UserData?.LastPlayedDate),
            playCount: album.UserData?.PlayCount || undefined,
            genres: album.Genres || undefined,
            inLibrary: album.UserData?.IsFavorite,
            thumbnails: this.createThumbnails(album),
            trackCount: album.ChildCount || undefined,
            artist: album.AlbumArtist || undefined,
            year: album.ProductionYear || undefined,
            release_mbid: album.ProviderIds?.MusicBrainzAlbum ?? undefined,
            pager: this.createAlbumTracksPager(album),
        };
    }

    private createMediaPlaylist(playlist: BaseItemDto): MediaPlaylist {
        const src = `emby:playlist:${playlist.Id}`;
        return {
            src,
            itemType: ItemType.Playlist,
            externalUrl: this.getExternalUrl(playlist),
            title: playlist.Name || '',
            description: playlist.Overview ?? undefined,
            duration: playlist.RunTimeTicks ? playlist.RunTimeTicks / 10_000_000 : 0,
            addedAt: this.parseDate(playlist.DateCreated),
            playedAt: this.parseDate(playlist.UserData?.LastPlayedDate),
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
            src: `emby:folder:${folder.Id}`,
            title: folder.Name || '[unknown]',
            fileName,
            path:
                this.parent?.itemType === ItemType.Folder ? `${this.parent.path}/${fileName}` : '/',
            parentFolder: this.parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder);
        return mediaFolder as MediaFolder;
    }

    private createMediaItem(track: BaseItemDto): MediaItem {
        const isVideo = track.MediaType === 'Video';
        const [source] = track.MediaSources || [];
        const artist_mbid = track.ProviderIds?.MusicBrainzArtist;
        return {
            itemType: ItemType.Media,
            mediaType: isVideo ? MediaType.Video : MediaType.Audio,
            src: `emby:${isVideo ? 'video' : 'audio'}:${track.Id}:${
                (track as any).PresentationUniqueKey || ''
            }`,
            externalUrl: this.getExternalUrl(track),
            fileName: this.getFileName(track.Path || '') || track.Name || '[unknown]',
            title: track.Name || '',
            duration: track.RunTimeTicks ? track.RunTimeTicks / 10_000_000 : 0,
            year: track.ProductionYear || undefined,
            addedAt: this.parseDate(track.DateCreated),
            playedAt: this.parseDate(track.UserData?.LastPlayedDate) || 0,
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
            bitRate: Math.floor((source?.Bitrate || 0) / 1000) || undefined,
            badge: isVideo
                ? track.IsHD === true
                    ? 'HD'
                    : track.IsHD === false
                    ? 'SD'
                    : undefined
                : track.Container || undefined,
            container: track.Container || undefined,
        };
    }

    private createThumbnails(
        item: BaseItemDto & {PrimaryImageItemId?: string}
    ): Thumbnail[] | undefined {
        const thumbnailId =
            item.PrimaryImageItemId || (item.ImageTags?.Primary ? item.Id : item.AlbumId);
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
        const url = `${embySettings.host}/emby/Items/${id}/Images/Primary?maxWidth=${width}&maxHeight=${height}`;
        return {url, width, height};
    }

    private createArtistAlbumsPager(artist: BaseItemDto): Pager<MediaAlbum> {
        const allTracks = this.createArtistAllTracks(artist);
        const allTracksPager = new SimplePager<MediaAlbum>([allTracks]);
        const albumsPager = new EmbyPager<MediaAlbum>(`Users/${embySettings.userId}/Items`, {
            AlbumArtistIds: artist.Id!,
            IncludeItemTypes: 'MusicAlbum',
            SortBy: 'ProductionYear,SortName',
            SortOrder: 'Descending',
        });
        return new WrappedPager(undefined, albumsPager, allTracksPager);
    }

    private createArtistAllTracks(artist: BaseItemDto): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `emby:all-tracks:${artist.Id}`,
            title: 'All Songs',
            artist: artist.Name || '',
            thumbnails: this.createThumbnails(artist),
            pager: this.createAllTracksPager(artist),
            trackCount: undefined,
            synthetic: true,
        };
    }

    private createAllTracksPager(artist: BaseItemDto): Pager<MediaItem> {
        return new EmbyPager<MediaItem>(`Users/${embySettings.userId}/Items`, {
            ArtistIds: artist.Id!,
            IncludeItemTypes: 'Audio',
            SortBy: 'SortName',
            SortOrder: 'Ascending',
        });
    }

    private createAlbumTracksPager(album: BaseItemDto): Pager<MediaItem> {
        return new EmbyPager(`Users/${embySettings.userId}/Items`, {
            ParentId: album.Id!,
            SortBy: 'ParentIndexNumber,IndexNumber',
            SortOrder: 'Ascending',
        });
    }

    private createPlaylistItemsPager(playlist: BaseItemDto): Pager<MediaItem> {
        return new EmbyPager(`Playlists/${playlist.Id}/Items`, {
            UserId: embySettings.userId,
            MediaType: 'Audio',
        });
    }

    private createFolderPager(folder: MediaFolder): Pager<MediaFolderItem> {
        const [, , id] = folder.src.split(':');
        const folderPager = new EmbyPager<MediaFolderItem>(
            `Users/${embySettings.userId}/Items`,
            {
                ParentId: id,
                IncludeItemTypes: 'Folder,MusicAlbum,MusicArtist,Audio,MusicVideo',
                Fields: 'AudioInfo,Genres,UserData,ParentId,Path,PresentationUniqueKey',
                EnableUserData: true,
                Recursive: false,
                SortBy: 'IsFolder,IndexNumber,FileName',
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
        return `${embySettings.host}/web/index.html#!/item?id=${item.Id}&serverId=${embySettings.serverId}`;
    }

    private getFileName(path: string): string | undefined {
        return path.split(/[/\\]/).pop();
    }

    private async getPage(
        path: string,
        params: Record<string, Primitive>
    ): Promise<Page<BaseItemDto>> {
        const data = await embyApi.get(path, params);
        return (data as BaseItemDto).Type
            ? {
                  items: [data as BaseItemDto],
                  total: 1,
              }
            : {
                  items: data.Items || [],
                  total: data.TotalRecordCount || data.Items?.length,
              };
    }

    private getParams(): Record<string, unknown> {
        return {
            IncludeItemTypes: 'Audio',
            Fields: 'AudioInfo,ChildCount,DateCreated,Genres,MediaSources,ParentIndexNumber,Path,ProductionYear,Overview,PresentationUniqueKey,ProviderIds,UserDataPlayCount,UserDataLastPlayedDate',
            EnableUserData: true,
            Recursive: true,
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary',
            EnableTotalRecordCount: true,
        };
    }

    private parseDate(date?: string | null): number | undefined {
        if (date) {
            const time = Date.parse(date) || 0;
            return time < 0 ? 0 : Math.round(time / 1000);
        }
    }
}
