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
import Pager, {Page} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import {canPlayType} from 'utils';
import {MAX_DURATION} from 'services/constants';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import stationStore from 'services/internetRadio/stationStore';
import type SubsonicService from './SubsonicService';
import type SubsonicApi from './SubsonicApi';
import SubsonicPager, {SubsonicPlaylistItemsPager} from './SubsonicPager';
import SubsonicAlbumsPager from './SubsonicAlbumsPager';

export default class SubsonicUtils {
    constructor(protected readonly service: SubsonicService) {}

    createMediaObject<T extends MediaObject>(
        itemType: ItemType,
        item: Subsonic.MediaObject,
        parent?: ParentOf<T>,
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
                return this.createFolderItem(
                    item as Subsonic.DirectoryItem,
                    parent as ParentOf<MediaFolder>
                ) as T;

            default:
                if ('streamUrl' in item) {
                    return this.createRadioStation(item) as T;
                } else {
                    return this.createMediaItem(item as Subsonic.MediaItem, position) as T;
                }
        }
    }

    createMediaAlbum(album: Subsonic.Album): MediaAlbum {
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

    createMediaArtist(artist: Subsonic.Artist): MediaArtist {
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

    createMediaFolder(folder: Subsonic.Directory, parent?: ParentOf<MediaFolder>): MediaFolder {
        const fileName = folder.title || '[unknown]';
        const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
            itemType: ItemType.Folder,
            src: `${this.service.id}:folder:${folder.id}`,
            title: fileName,
            fileName,
            path: parent?.itemType === ItemType.Folder ? `${parent.path}/${fileName}` : '/',
            parentFolder: parent as ParentOf<MediaFolder>,
        };
        mediaFolder.pager = this.createFolderPager(mediaFolder as MediaFolder, parent);
        return mediaFolder as MediaFolder;
    }

    createMediaItem(
        item: Subsonic.MediaItem,
        position?: number
    ): SetRequired<MediaItem, 'fileName'> {
        if (item.type === 'video') {
            return this.createMediaItemFromVideo(item, position);
        } else {
            return this.createMediaItemFromSong(item, position);
        }
    }

    private get api(): SubsonicApi {
        return this.service.api;
    }

    createMediaItemFromSong(
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
            albumArtist: song.albumArtist || song.albumArtists?.[0]?.name,
            isrc: song.isrc?.[0],
            recording_mbid:
                typeof song.musicBrainzId === 'string'
                    ? song.musicBrainzId || undefined
                    : undefined,
            albumGain: song.replayGain?.albumGain,
            albumPeak: song.replayGain?.albumPeak,
            trackGain: song.replayGain?.trackGain,
            trackPeak: song.replayGain?.trackPeak,
        };
    }

    createMediaItemFromVideo(
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

    createMediaPlaylist(playlist: Subsonic.Playlist): MediaPlaylist {
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

    createPlaylistItemsPager(
        playlist: MediaPlaylist,
        items?: readonly Subsonic.MediaItem[]
    ): Pager<MediaItem> {
        return new SubsonicPlaylistItemsPager(this.service, playlist, items);
    }

    createRadioStation(radio: Subsonic.Radio): MediaItem {
        const src = `${this.service.id}:radio:${radio.id}`;
        return {
            src,
            srcs: [radio.streamUrl],
            title: radio.name,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Station,
            externalUrl: radio.homePageUrl || radio.homepageUrl || undefined,
            duration: MAX_DURATION,
            playedAt: 0,
            isExternalMedia: true,
            isFavoriteStation: stationStore.isFavorite({src}),
        };
    }

    createThumbnails(id: string): Thumbnail[] | undefined {
        return id
            ? [
                  this.createThumbnail(id, 240),
                  this.createThumbnail(id, 360),
                  this.createThumbnail(id, 480),
                  this.createThumbnail(id, 800),
              ]
            : undefined;
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
        const albumsPager = new SubsonicAlbumsPager(this.service, artist);
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimplePager([topTracks]);
        const radios = this.createArtistRadios(artist);
        const radiosPager = new SimplePager([radios]);
        return new WrappedPager(topTracksPager, albumsPager, radiosPager);
    }

    private createArtistRadios(artist: Subsonic.Artist): MediaAlbum {
        const src = `${this.service.id}:artist-radio:${artist.id}`;
        const thumbnails = this.createThumbnails(artist.coverArt);
        const radio: MediaItem = {
            src,
            title: `${artist.name} - Radio`,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            linearType: LinearType.Station,
            playbackType: PlaybackType.Direct,
            duration: MAX_DURATION,
            thumbnails,
            playedAt: 0,
            skippable: true,
            isFavoriteStation: stationStore.isFavorite({src}),
        };
        return {
            itemType: ItemType.Album,
            src: `${this.service.id}:radios:${artist.id}`,
            title: 'Radios',
            artist: artist.name,
            thumbnails,
            pager: new SimplePager([radio]),
            trackCount: undefined,
            synthetic: true,
        };
    }

    private createArtistTopTracks(artist: Subsonic.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `${this.service.id}:top-tracks:${artist.id}`,
            title: 'Top Songs',
            artist: artist.name,
            thumbnails: this.createThumbnails(artist.coverArt),
            pager: this.service.createTopTracksPager(artist.name),
            trackCount: undefined,
            synthetic: true,
        };
    }

    private createFolderItem(
        item: Subsonic.DirectoryItem,
        parent?: ParentOf<MediaFolder>
    ): MediaFolderItem {
        if ('type' in item) {
            return this.createMediaItem(item);
        } else {
            return this.createMediaFolder(item, parent);
        }
    }

    private createFolderPager(
        folder: MediaFolder,
        parent?: ParentOf<MediaFolder>
    ): Pager<MediaFolderItem> {
        const [, , id] = folder.src.split(':');
        const folderPager = new SubsonicPager<MediaFolderItem>(
            this.service,
            ItemType.Folder,
            async (): Promise<Page<Subsonic.DirectoryItem>> => {
                const items = await this.api.getMusicDirectoryItems(id);
                return {items, atEnd: true};
            },
            {pageSize: 200},
            folder
        );
        if (parent?.itemType === ItemType.Folder) {
            const parentFolder: MediaFolderItem = {
                ...parent,
                fileName: `../${parent.fileName}`,
            };
            const backPager = new SimplePager([parentFolder]);
            return new WrappedPager<MediaFolderItem>(backPager, folderPager);
        } else {
            return folderPager;
        }
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

    private parseDate(date: string): number {
        const time = Date.parse(date) || 0;
        return time < 0 ? 0 : Math.round(time / 1000);
    }
}
