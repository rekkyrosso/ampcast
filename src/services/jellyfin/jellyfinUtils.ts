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
import Pager from 'types/Pager';
import ParentOf from 'types/ParentOf';
import SortParams from 'types/SortParams';
import Thumbnail from 'types/Thumbnail';
import {uniq} from 'utils';
import pinStore from 'services/pins/pinStore';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import JellyfinPager from './JellyfinPager';
import jellyfinApi from './jellyfinApi';
import jellyfinSettings from './jellyfinSettings';

type LegacyBaseItemDto = BaseItemDto & {LUFS?: number | null};

export function createMediaObject<T extends MediaObject>(
    item: BaseItemDto,
    parent?: ParentOf<T>,
    childSort?: SortParams
): T {
    if (parent?.itemType === ItemType.Folder && item.IsFolder) {
        return createMediaFolder(item, parent) as T;
    } else {
        switch (item.Type) {
            case 'MusicArtist':
                return createMediaArtist(item, childSort) as T;

            case 'MusicAlbum':
                return createMediaAlbum(item) as T;

            case 'Playlist':
                return createMediaPlaylist(item, childSort) as T;

            default: {
                return createMediaItem(item) as T;
            }
        }
    }
}

export async function getAlbums(items: readonly BaseItemDto[]): Promise<readonly BaseItemDto[]> {
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

function createMediaArtist(artist: BaseItemDto, albumSort?: SortParams): MediaArtist {
    const mediaArtist: Writable<SetOptional<MediaArtist, 'pager'>> = {
        itemType: ItemType.Artist,
        src: `jellyfin:artist:${artist.Id}`,
        externalUrl: getExternalUrl(artist),
        title: artist.Name || '',
        playCount: artist.UserData?.PlayCount || undefined,
        genres: artist.Genres || undefined,
        thumbnails: createThumbnails(artist),
        inLibrary: artist.UserData?.IsFavorite,
        artist_mbid: artist.ProviderIds?.MusicBrainzArtist ?? undefined,
    };
    mediaArtist.pager = createArtistAlbumsPager(mediaArtist as MediaArtist, albumSort);
    return mediaArtist as MediaArtist;
}

function createMediaAlbum(album: BaseItemDto): MediaAlbum {
    return {
        itemType: ItemType.Album,
        src: `jellyfin:album:${album.Id}`,
        externalUrl: getExternalUrl(album),
        title: album.Name || '',
        description: album.Overview ?? undefined,
        duration: album.RunTimeTicks ? album.RunTimeTicks / 10_000_000 : 0,
        addedAt: parseDate(album.DateCreated),
        playedAt: parseDate(album.UserData?.LastPlayedDate),
        playCount: album.UserData?.PlayCount || undefined,
        genres: album.Genres || undefined,
        thumbnails: createThumbnails(album),
        inLibrary: album.UserData?.IsFavorite,
        trackCount: album.ChildCount || undefined,
        pager: createAlbumTracksPager(album),
        artist: album.AlbumArtist || undefined,
        release_mbid: album.ProviderIds?.MusicBrainzAlbum ?? undefined,
        year: album.ProductionYear || undefined,
    };
}

function createMediaPlaylist(playlist: BaseItemDto, itemSort?: SortParams): MediaPlaylist {
    const src = `jellyfin:playlist:${playlist.Id}`;
    const mediaPlaylist: Writable<SetOptional<MediaPlaylist, 'pager'>> = {
        src,
        itemType: ItemType.Playlist,
        externalUrl: getExternalUrl(playlist),
        title: playlist.Name || '',
        description: playlist.Overview ?? undefined,
        duration: playlist.RunTimeTicks ? playlist.RunTimeTicks / 10_000_000 : 0,
        addedAt: parseDate(playlist.DateCreated),
        playedAt: parseDate(playlist.UserData?.LastPlayedDate),
        playCount: playlist.UserData?.PlayCount || undefined,
        genres: playlist.Genres || undefined,
        thumbnails: createThumbnails(playlist),
        inLibrary: playlist.UserData?.IsFavorite,
        trackCount: playlist.ChildCount || undefined,
        isPinned: pinStore.isPinned(src),
    };
    mediaPlaylist.pager = createPlaylistItemsPager(mediaPlaylist as MediaPlaylist, itemSort);
    return mediaPlaylist as MediaPlaylist;
}

function createMediaFolder(folder: BaseItemDto, parent?: MediaFolder): MediaFolder {
    const fileName = getFileName(folder.Path || '') || folder.Name || '[unknown]';
    const mediaFolder: Writable<SetOptional<MediaFolder, 'pager'>> = {
        itemType: ItemType.Folder,
        src: `jellyfin:folder:${folder.Id}`,
        title: folder.Name || '[unknown]',
        fileName,
        path: parent ? `${parent.path}/${fileName}` : '/',
        parentFolder: parent,
    };
    mediaFolder.pager = createFolderPager(mediaFolder as MediaFolder, parent);
    return mediaFolder as MediaFolder;
}

function createMediaItem(track: LegacyBaseItemDto): MediaItem {
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
        externalUrl: getExternalUrl(track),
        fileName: getFileName(track.Path || '') || track.Name || '[unknown]',
        title: track.Name || '',
        duration: track.RunTimeTicks ? track.RunTimeTicks / 10_000_000 : 0,
        year: track.ProductionYear || undefined,
        addedAt: parseDate(track.DateCreated),
        playedAt: parseDate(track.UserData?.LastPlayedDate) || 0,
        playCount: track.UserData?.PlayCount || undefined,
        genres: track.Genres || undefined,
        thumbnails: createThumbnails(track),
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
        trackGain: isVideo ? undefined : getGain(track),
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

function createThumbnails(item: BaseItemDto): Thumbnail[] | undefined {
    const thumbnailId = item.ImageTags?.Primary ? item.Id : item.AlbumId;
    return thumbnailId
        ? [
              createThumbnail(thumbnailId, 240),
              createThumbnail(thumbnailId, 360),
              createThumbnail(thumbnailId, 480),
              createThumbnail(thumbnailId, 800),
          ]
        : undefined;
}

function createThumbnail(id: string, width: number, height = width): Thumbnail {
    const url = `${jellyfinSettings.host}/Items/${id}/Images/Primary?fillWidth=${width}&fillHeight=${height}`;
    return {url, width, height};
}

function createAlbumTracksPager(album: BaseItemDto): Pager<MediaItem> {
    return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, {
        ParentId: album.Id!,
        SortBy: 'SortName',
        SortOrder: 'Ascending',
    });
}

export function createArtistAlbumsPager(
    artist: MediaArtist,
    albumSort: SortParams = {
        sortBy: 'ProductionYear,PremiereDate,SortName',
        sortOrder: -1,
    }
): Pager<MediaAlbum> {
    const allTracks = createArtistAllTracks(artist);
    const allTracksPager = new SimplePager<MediaAlbum>([allTracks]);
    const albumsPager = new JellyfinPager<MediaAlbum>(`Users/${jellyfinSettings.userId}/Items`, {
        AlbumArtistIds: getId(artist),
        IncludeItemTypes: 'MusicAlbum',
        ...getSort(albumSort),
    });
    return new WrappedPager(undefined, albumsPager, allTracksPager);
}

function createArtistAllTracks(artist: MediaArtist): MediaAlbum {
    return {
        itemType: ItemType.Album,
        src: `jellyfin:all-tracks:${getId(artist)}`,
        title: 'All Songs',
        artist: artist.title,
        thumbnails: artist.thumbnails,
        pager: createAllTracksPager(artist),
        trackCount: undefined,
        synthetic: true,
    };
}

function createAllTracksPager(artist: MediaArtist): Pager<MediaItem> {
    return new JellyfinPager<MediaItem>(`Users/${jellyfinSettings.userId}/Items`, {
        ArtistIds: getId(artist),
        IncludeItemTypes: 'Audio',
        SortBy: 'Name',
        SortOrder: 'Ascending',
    });
}

export function createPlaylistItemsPager(
    playlist: MediaPlaylist,
    itemSort: SortParams = {
        sortBy: 'ListItemOrder',
        sortOrder: 1,
    }
): Pager<MediaItem> {
    return new JellyfinPager(`Users/${jellyfinSettings.userId}/Items`, {
        ParentId: getId(playlist),
        IncludeItemTypes: 'Audio,MusicVideo',
        ...getSort(itemSort),
    });
}

function createFolderPager(folder: MediaFolder, parent?: MediaFolder): Pager<MediaFolderItem> {
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
        undefined,
        folder
    );
    if (parent) {
        const parentFolder: MediaFolder = {
            ...parent,
            fileName: `../${parent.fileName}`,
        };
        const backPager = new SimplePager([parentFolder]);
        return new WrappedPager<MediaFolderItem>(backPager, folderPager);
    } else {
        return folderPager;
    }
}

function getExternalUrl(item: BaseItemDto): string {
    return `${jellyfinSettings.host}/web/index.html#!/details?id=${item.Id}&serverId=${jellyfinSettings.serverId}`;
}

function getFileName(path: string): string | undefined {
    return path.split(/[/\\]/).pop();
}

function parseDate(date?: string | null): number | undefined {
    if (date) {
        const time = Date.parse(date) || 0;
        return time < 0 ? 0 : Math.round(time / 1000);
    }
}

function getId({src}: {src: string}): string {
    const [, , id] = src.split(':');
    return id;
}

export function getSort({sortBy, sortOrder}: SortParams): {
    SortBy: string;
    SortOrder: string;
} {
    return {
        SortBy: sortBy,
        SortOrder:
            sortOrder === 1
                ? 'Ascending'
                : // Pad with 'Ascending'.
                  sortBy
                      .split(',')
                      .map((sortBy, index, keys) =>
                          index === 1 &&
                          (keys[0] === 'ProductionYear' || keys[0] === 'PremiereDate') &&
                          (sortBy === 'ProductionYear' || sortBy === 'PremiereDate')
                              ? 'Descending'
                              : index === 0
                              ? 'Descending'
                              : 'Ascending'
                      )
                      .join(','),
    };
}
