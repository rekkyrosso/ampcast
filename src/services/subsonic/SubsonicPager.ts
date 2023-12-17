import type {Observable} from 'rxjs';
import {SetOptional, SetRequired, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import {ParentOf} from 'utils';
import subsonicApi from './subsonicApi';
import subsonicSettings from './subsonicSettings';

export default class SubsonicPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 500;

    private readonly pager: Pager<T>;
    private readonly pageSize: number;
    private pageNumber = 1;

    constructor(
        itemType: ItemType,
        fetch: (offset: number, count: number) => Promise<Page<Subsonic.MediaObject>>,
        options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        this.pageSize = options?.pageSize || 200;
        this.pager = new SequentialPager<T>(
            async (): Promise<Page<T>> => {
                const count = this.pageSize;
                const offset = (this.pageNumber - 1) * count;
                const {items, total, atEnd} = await fetch(offset, count);
                this.pageNumber++;
                return {
                    items: items.map((item) => this.createMediaObject(itemType, item)),
                    total,
                    atEnd,
                };
            },
            {
                pageSize: this.pageSize,
                ...options,
            }
        );
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

    private createMediaObject(itemType: ItemType, item: Subsonic.MediaObject): T {
        let mediaObject: T;
        switch (itemType) {
            case ItemType.Album:
                mediaObject = this.createMediaAlbum(item as Subsonic.Album) as T;
                break;

            case ItemType.Artist:
                mediaObject = this.createMediaArtist(item as Subsonic.Artist) as T;
                break;

            case ItemType.Playlist:
                mediaObject = this.createMediaPlaylist(item as Subsonic.Playlist) as T;
                break;

            case ItemType.Folder:
                mediaObject = this.createFolderItem(item as Subsonic.DirectoryItem) as T;
                break;

            default:
                mediaObject = this.createMediaItem(item as Subsonic.MediaItem) as T;
        }
        return mediaObject;
    }

    private createMediaItem(item: Subsonic.MediaItem): SetRequired<MediaItem, 'fileName'> {
        if (item.type === 'video') {
            return this.createMediaItemFromVideo(item);
        } else {
            return this.createMediaItemFromSong(item);
        }
    }

    private createFolderItem(item: Subsonic.DirectoryItem): MediaFolderItem {
        if ('type' in item) {
            return this.createMediaItem(item);
        } else {
            return this.createMediaFolder(item);
        }
    }

    private createMediaItemFromSong(song: Subsonic.Song): SetRequired<MediaItem, 'fileName'> {
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            playbackType: PlaybackType.Direct,
            src: `subsonic:audio:${song.id}`,
            fileName: this.getFileName(song.path || '') || '[unknown]',
            title: song.title,
            artists: [song.artist],
            album: song.album,
            duration: song.duration,
            track: song.track,
            disc: song.discNumber,
            year: song.year,
            playedAt: 0,
            playCount: song.playCount,
            inLibrary: !!song.starred,
            genres: song.genre ? [song.genre] : undefined,
            thumbnails: this.createThumbnails(song.coverArt),
        };
    }

    private createMediaItemFromVideo(video: Subsonic.Video): SetRequired<MediaItem, 'fileName'> {
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            playbackType: PlaybackType.Direct,
            src: `subsonic:video:${video.id}`,
            fileName: this.getFileName(video.path || '') || '[unknown]',
            title: video.title,
            duration: video.duration,
            playedAt: 0,
            playCount: video.playCount,
            inLibrary: !!video.starred,
            thumbnails: this.createThumbnails(video.id),
        };
    }

    private createMediaAlbum(album: Subsonic.Album): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `subsonic:album:${album.id}`,
            title: album.name,
            addedAt: this.parseDate(album.created),
            artist: album.artist,
            year: album.year,
            playCount: album.playCount,
            inLibrary: !!album.starred,
            genres: album.genre ? [album.genre] : undefined,
            pager: this.createAlbumTracksPager(album),
            thumbnails: this.createThumbnails(album.coverArt),
            subsonic: {
                isDir: album.isDir,
            },
        };
    }

    private createMediaArtist(artist: Subsonic.Artist): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: `subsonic:artist:${artist.id}`,
            title: artist.name,
            pager: this.createArtistAlbumsPager(artist),
            thumbnails: this.createThumbnails(artist.coverArt),
            inLibrary: !!artist.starred,
        };
    }

    private createMediaPlaylist(playlist: Subsonic.Playlist): MediaPlaylist {
        const src = `subsonic:playlist:${playlist.id}`;
        return {
            src,
            itemType: ItemType.Playlist,
            title: playlist.name,
            description: playlist.comment,
            addedAt: this.parseDate(playlist.created),
            duration: playlist.duration,
            trackCount: playlist.songCount,
            pager: this.createPlaylistItemsPager(playlist),
            thumbnails: this.createThumbnails(playlist.coverArt),
            isPinned: pinStore.isPinned(src),
            isOwn: playlist.owner === subsonicSettings.userName,
            owner: {
                name: playlist.owner,
            },
        };
    }

    private createMediaFolder(folder: Subsonic.Directory): MediaFolder {
        const fileName = folder.title || '[unknown]';
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `subsonic:folder:${folder.id}`,
            title: fileName,
            fileName,
            path:
                this.parent?.itemType === ItemType.Folder ? `${this.parent.path}/${fileName}` : '/',
            parent: this.parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder);
        return mediaFolder as MediaFolder;
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
        const url = `${subsonicSettings.host}/rest/getCoverArt?id=${id}&size=${width}&{subsonic-credentials}`; // not a typo
        return {url, width, height};
    }

    private getFileName(path: string): string | undefined {
        return path.split(/[/\\]/).pop();
    }

    private createAlbumTracksPager(album: Subsonic.Album): Pager<MediaItem> {
        if (album.song) {
            return new SimplePager(
                album.song.map((song) => this.createMediaObject(ItemType.Media, song) as MediaItem)
            );
        } else {
            return new SubsonicPager(
                ItemType.Media,
                async (): Promise<Page<Subsonic.MediaItem>> => {
                    const items = await subsonicApi.getAlbumTracks(album.id, album.isDir);
                    return {items, atEnd: true};
                }
            );
        }
    }

    private createArtistAlbumsPager(artist: Subsonic.Artist): Pager<MediaAlbum> {
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimplePager([topTracks]);
        const albumsPager = artist.album
            ? new SimplePager(
                  artist.album.map(
                      (album) => this.createMediaObject(ItemType.Album, album) as MediaAlbum
                  )
              )
            : new SubsonicPager<MediaAlbum>(
                  ItemType.Album,
                  async () => {
                      const items = await subsonicApi.getArtistAlbums(artist.id);
                      return {items, atEnd: true};
                  },
                  undefined
              );
        return new WrappedPager(topTracksPager, albumsPager);
    }

    private createArtistTopTracks(artist: Subsonic.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `subsonic:top-tracks:${artist.id}`,
            title: 'Top Songs',
            artist: artist.name,
            thumbnails: this.createThumbnails(artist.coverArt),
            pager: this.createTopTracksPager(artist),
            synthetic: true,
        };
    }

    private createTopTracksPager(artist: Subsonic.Artist): Pager<MediaItem> {
        return new SubsonicPager(ItemType.Media, async () => {
            const items = await subsonicApi.getArtistTopTracks(artist.name);
            return {items, atEnd: true};
        });
    }

    private createPlaylistItemsPager(playlist: Subsonic.Playlist): Pager<MediaItem> {
        if (playlist.entry) {
            return new SimplePager(
                playlist.entry.map(
                    (entry) => this.createMediaObject(ItemType.Media, entry) as MediaItem
                )
            );
        } else {
            return new SubsonicPager(ItemType.Media, async () => {
                const items = await subsonicApi.getPlaylistItems(playlist.id);
                return {items, atEnd: true};
            });
        }
    }

    private createFolderPager(folder: MediaFolder): Pager<MediaFolderItem> {
        const [, , id] = folder.src.split(':');
        const folderPager = new SubsonicPager<MediaFolderItem>(
            ItemType.Folder,
            async (): Promise<Page<Subsonic.DirectoryItem>> => {
                const items = await subsonicApi.getMusicDirectoryItems(id);
                return {items, atEnd: true};
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
}
