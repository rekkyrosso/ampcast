import {BehaviorSubject, debounceTime, filter, mergeMap, switchMap, tap} from 'rxjs';
import {nanoid} from 'nanoid';
import {SetOptional, SetRequired, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaFolder from 'types/MediaFolder';
import MediaFolderItem from 'types/MediaFolderItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import {Logger, canPlayType, getMediaObjectId, moveSubset} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import type SubsonicService from './SubsonicService';
import SubsonicApi from './SubsonicApi';

export default class SubsonicPager<T extends MediaObject> extends SequentialPager<T> {
    constructor(
        protected readonly service: SubsonicService,
        itemType: T['itemType'],
        fetch: (offset: number, count: number) => Promise<Page<Subsonic.MediaObject>>,
        options?: Partial<PagerConfig<T>>,
        protected readonly parent?: ParentOf<T>
    ) {
        let pageNumber = 1;

        super(
            async (count: number): Promise<Page<T>> => {
                const offset = (pageNumber - 1) * count;
                const {items, total, atEnd} = await fetch(offset, count);
                pageNumber++;
                return {
                    items: items.map((item, index) =>
                        this.createMediaObject(
                            itemType,
                            item,
                            parent?.itemType === ItemType.Playlist ? index + 1 : undefined
                        )
                    ),
                    total,
                    atEnd,
                };
            },
            {pageSize: 200, ...options}
        );
    }

    protected get api(): SubsonicApi {
        return this.service.api;
    }

    private createMediaObject(
        itemType: ItemType,
        item: Subsonic.MediaObject,
        position?: number
    ): T {
        switch (itemType) {
            case ItemType.Album:
                return this.createMediaAlbum(item as Subsonic.Album) as T;

            case ItemType.Artist:
                return this.createMediaArtist(item as Subsonic.Artist) as T;

            case ItemType.Playlist:
                return this.createMediaPlaylist(item as Subsonic.Playlist) as T;

            case ItemType.Folder:
                return this.createFolderItem(item as Subsonic.DirectoryItem) as T;

            default:
                if ('streamUrl' in item) {
                    return this.createRadioItem(item) as T;
                } else {
                    return this.createMediaItem(item as Subsonic.MediaItem, position) as T;
                }
        }
    }

    private createMediaItem(
        item: Subsonic.MediaItem,
        position?: number
    ): SetRequired<MediaItem, 'fileName'> {
        if (item.type === 'video') {
            return this.createMediaItemFromVideo(item, position);
        } else {
            return this.createMediaItemFromSong(item, position);
        }
    }

    private createFolderItem(item: Subsonic.DirectoryItem): MediaFolderItem {
        if ('type' in item) {
            return this.createMediaItem(item);
        } else {
            return this.createMediaFolder(item);
        }
    }

    private createMediaItemFromSong(
        song: Subsonic.Song,
        position?: number
    ): SetRequired<MediaItem, 'fileName'> {
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            playbackType: PlaybackType.Direct,
            src: `${this.service.id}:audio:${song.id}`,
            fileName: this.getFileName(song.path || '') || '[unknown]',
            title: song.title,
            artists: [song.artist],
            album: song.album,
            duration: song.duration,
            track: song.track,
            disc: song.discNumber,
            year: song.year || undefined,
            playedAt: 0,
            playCount: song.playCount,
            position,
            playlistItemId: position == null ? undefined : String(position - 1),
            nanoId: position == null ? undefined : nanoid(),
            inLibrary: !!song.starred,
            rating: song.userRating || 0,
            genres: song.genre ? [song.genre] : undefined,
            thumbnails: this.createThumbnails(song.coverArt),
            bitRate: song.bitRate,
            badge: song.suffix,
            container: song.contentType?.replace('audio/', ''),
            // OpenSubsonic extensions
            recording_mbid:
                typeof song.musicBrainzId === 'string'
                    ? song.musicBrainzId || undefined
                    : undefined,
            albumGain: song.replayGain?.albumGain,
            trackGain: song.replayGain?.trackGain,
        };
    }

    private createMediaItemFromVideo(
        video: Subsonic.Video,
        position?: number
    ): SetRequired<MediaItem, 'fileName'> {
        const height = video.originalHeight || 0;
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            playbackType: canPlayType('video', video.contentType)
                ? PlaybackType.Direct
                : PlaybackType.HLS,
            src: `${this.service.id}:video:${video.id}`,
            fileName: this.getFileName(video.path || '') || '[unknown]',
            title: video.title,
            duration: video.duration,
            playedAt: 0,
            playCount: video.playCount,
            position,
            playlistItemId: position == null ? undefined : String(position - 1),
            nanoId: position == null ? undefined : nanoid(),
            inLibrary: !!video.starred,
            thumbnails: this.createThumbnails(video.id),
            bitRate: video.bitRate,
            badge: height > 1080 ? 'UHD' : height >= 720 ? 'HD' : height > 0 ? 'SD' : undefined,
            container: video.contentType?.replace('video/', ''),
        };
    }

    private createRadioItem(radio: Subsonic.Radio): MediaItem {
        return {
            src: `${this.service.id}:radio:${radio.id}`,
            srcs: [radio.streamUrl],
            title: radio.name,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Station,
            externalUrl: radio.homePageUrl || radio.homepageUrl || undefined,
            duration: MAX_DURATION,
            playedAt: 0,
            isExternalMedia: true,
        };
    }

    private createMediaAlbum(album: Subsonic.Album): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.service.id}:album:${album.id}`,
            title: album.name,
            addedAt: this.parseDate(album.created),
            artist: album.artist,
            year: album.year || undefined,
            playCount: album.playCount,
            trackCount: album.songCount,
            inLibrary: !!album.starred,
            rating: album.userRating || 0,
            genres: album.genre ? [album.genre] : undefined,
            pager: this.createAlbumTracksPager(album),
            thumbnails: this.createThumbnails(album.coverArt),
            subsonic: {
                isDir: album.isDir,
            },
            // OpenSubsonic extensions
            release_mbid: typeof album.musicBrainzId === 'string' ? album.musicBrainzId : undefined,
        };
    }

    private createMediaArtist(artist: Subsonic.Artist): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: `${this.service.id}:artist:${artist.id}`,
            title: artist.name,
            pager: this.createArtistAlbumsPager(artist),
            thumbnails: this.createThumbnails(artist.coverArt),
            inLibrary: !!artist.starred,
            rating: artist.userRating || 0,
            // OpenSubsonic extensions
            artist_mbid:
                typeof artist.musicBrainzId === 'string' ? artist.musicBrainzId : undefined,
        };
    }

    private createMediaPlaylist(playlist: Subsonic.Playlist): MediaPlaylist {
        const src = `${this.service.id}:playlist:${playlist.id}`;
        const owned = playlist.owner === this.service.settings.userName;
        const mediaPlaylist: Writable<SetOptional<MediaPlaylist, 'pager'>> = {
            src,
            itemType: ItemType.Playlist,
            title: playlist.name,
            description: playlist.comment,
            addedAt: this.parseDate(playlist.created),
            modifiedAt: this.parseDate(playlist.changed),
            duration: playlist.duration,
            trackCount: playlist.songCount,
            thumbnails: this.createThumbnails(playlist.coverArt),
            isPinned: pinStore.isPinned(src),
            owned,
            owner: {name: playlist.owner},
            editable: owned,
            public: playlist.public,
            items: owned
                ? {
                      deletable: true,
                      droppable: true,
                      moveable: true,
                  }
                : undefined,
        };
        mediaPlaylist.pager = this.createPlaylistItemsPager(
            mediaPlaylist as MediaPlaylist,
            playlist.entry
        );
        return mediaPlaylist as MediaPlaylist;
    }

    private createMediaFolder(folder: Subsonic.Directory): MediaFolder {
        const fileName = folder.title || '[unknown]';
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `${this.service.id}:folder:${folder.id}`,
            title: fileName,
            fileName,
            path:
                this.parent?.itemType === ItemType.Folder ? `${this.parent.path}/${fileName}` : '/',
            parentFolder: this.parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder);
        return mediaFolder as MediaFolder;
    }

    createPlaylistItemsPager(
        playlist: MediaPlaylist,
        items?: readonly Subsonic.MediaItem[]
    ): Pager<MediaItem> {
        return new SubsonicPlaylistItemsPager(this.service, playlist, items);
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
        const service = this.service;
        const host = service.settings.host;
        const url = `${host}/rest/getCoverArt?id=${id}&size=${width}&{${service.id}-credentials}`;
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
                this.service,
                ItemType.Media,
                async (): Promise<Page<Subsonic.MediaItem>> => {
                    const items = await this.api.getAlbumTracks(album.id, album.isDir);
                    return {items, atEnd: true};
                }
            );
        }
    }

    private createArtistAlbumsPager(artist: Subsonic.Artist): Pager<MediaAlbum> {
        const albumsPager = artist.album
            ? new SimplePager(
                  artist.album.map(
                      (album) => this.createMediaObject(ItemType.Album, album) as MediaAlbum
                  )
              )
            : new SubsonicPager<MediaAlbum>(
                  this.service,
                  ItemType.Album,
                  async () => {
                      const items = await this.api.getArtistAlbums(artist.id);
                      return {items, atEnd: true};
                  },
                  undefined
              );
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimplePager([topTracks]);
        return new WrappedPager(topTracksPager, albumsPager);
    }

    private createArtistTopTracks(artist: Subsonic.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.service.id}:top-tracks:${artist.id}`,
            title: 'Top Songs',
            artist: artist.name,
            thumbnails: this.createThumbnails(artist.coverArt),
            pager: this.createTopTracksPager(artist),
            trackCount: undefined,
            synthetic: true,
        };
    }

    private createTopTracksPager(artist: Subsonic.Artist): Pager<MediaItem> {
        return new SubsonicPager(this.service, ItemType.Media, async () => {
            const items = await this.api.getArtistTopTracks(artist.name);
            return {items, atEnd: true};
        });
    }

    private createFolderPager(folder: MediaFolder): Pager<MediaFolderItem> {
        const [, , id] = folder.src.split(':');
        const folderPager = new SubsonicPager<MediaFolderItem>(
            this.service,
            ItemType.Folder,
            async (): Promise<Page<Subsonic.DirectoryItem>> => {
                const items = await this.api.getMusicDirectoryItems(id);
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

// TODO: This needs to be exported from here to avoid circular references.

const logger = new Logger('SubsonicPlaylistItemsPager');

export class SubsonicPlaylistItemsPager extends SubsonicPager<MediaItem> {
    private readonly removals$ = new BehaviorSubject<readonly number[]>([]);

    constructor(
        service: SubsonicService,
        playlist: MediaPlaylist,
        items?: readonly Subsonic.MediaItem[]
    ) {
        const [, , playlistId] = playlist.src.split(':');
        super(
            service,
            ItemType.Media,
            async () => {
                if (!items) {
                    items = await this.api.getPlaylistItems(playlistId);
                }
                return {items, atEnd: true};
            },
            {itemKey: 'nanoId' as any},
            playlist
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(additions: readonly MediaItem[], position = -1): void {
        const append = position < 0 || position >= this.size!;
        this._addItems(additions, position);
        if (append) {
            this.synchAdditions(additions);
        } else {
            this.synch();
        }
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.synchPositions(items);
            this.items = items;
            this.synch();
        }
    }

    // The Subsonic API uses indexes for removals.
    // The playlist item index is stored in `playlistItemId` of `MediaItem`.

    removeItems(removals: readonly MediaItem[]): void {
        const indexesToRemove = new Set(removals.map((item) => Number(item.playlistItemId)));
        const items = this.items.filter(
            (item) => !indexesToRemove.has(Number(item.playlistItemId))
        );
        this.size = items.length;
        this.items = items;
        this.removals$.next(this.removals$.value.concat([...indexesToRemove]));
        this.updateTrackCount();
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.removals$.pipe(
                    filter((removals) => removals.length > 0),
                    debounceTime(500),
                    mergeMap((removals) => this.synchRemovals(removals))
                ),
                logger
            );
            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistAdditions(this.playlist)),
                    tap((items) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private get playlist(): MediaPlaylist {
        return this.parent as MediaPlaylist;
    }

    private _addItems(additions: readonly MediaItem[], position = -1): void {
        const items = this.items.slice();
        if (position >= 0 && position < items.length) {
            // insert
            items.splice(position, 0, ...additions.map((item) => ({...item, nanoid: nanoid()})));
            this.synchPositions(items);
        } else {
            // append
            additions.forEach((item) => {
                const position = items.length + 1;
                items.push({
                    ...item,
                    position,
                    playlistItemId: String(position),
                    nanoId: nanoid(),
                });
            });
        }
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
    }

    private async synch(): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            const playlistId = getMediaObjectId(this.playlist);
            const indexesToRemove: number[] = [];
            this.items.forEach((item) => {
                if (item.playlistItemId != null) {
                    indexesToRemove.push(Number(item.playlistItemId));
                }
            });
            const idsToAdd = this.items.map((item) => getMediaObjectId(item));
            await this.api.removeFromPlaylist(playlistId, indexesToRemove);
            await this.api.addToPlaylist(playlistId, idsToAdd);
            this.synchPlaylistItemIds();
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private async synchAdditions(additions: readonly MediaItem[]) {
        this.busy = true;
        try {
            this.error = undefined;
            const playlistId = getMediaObjectId(this.playlist);
            await this.api.addToPlaylist(playlistId, additions.map(getMediaObjectId));
            this.synchPlaylistItemIds();
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private synchPlaylistItemIds(): void {
        this.items.forEach((item) => ((item as any).playlistItemId = String(item.position! - 1)));
        this.items = this.items.slice();
    }

    private synchPositions(items: readonly MediaItem[]): void {
        items.forEach((item, index) => ((item as any).position = index + 1));
    }

    private async synchRemovals(removals: readonly number[]): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            this.synchPositions(this.items);
            this.items = this.items.slice();
            const playlistId = getMediaObjectId(this.playlist);
            await this.api.removeFromPlaylist(playlistId, removals);
            this.synchPlaylistItemIds();
            this.removals$.next([]);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private updateTrackCount(): void {
        dispatchMetadataChanges({
            match: (object) => object.src === this.playlist.src,
            values: {trackCount: this.size},
        });
    }
}
