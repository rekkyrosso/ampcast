import {SetOptional, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PlaybackType from 'types/PlaybackType';
import SortParams from 'types/SortParams';
import Thumbnail from 'types/Thumbnail';
import {getTextFromHtml} from 'utils';
import {MAX_DURATION} from 'services/constants';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import NavidromeOffsetPager from './NavidromeOffsetPager';
import navidromeSettings from './navidromeSettings';

export function createMediaObject<T extends MediaObject>(
    itemType: T['itemType'],
    item: Navidrome.MediaObject,
    isRadio?: boolean,
    childSort?: SortParams
): T {
    switch (itemType) {
        case ItemType.Album:
            return createMediaAlbum(item as Navidrome.Album) as T;

        case ItemType.Artist:
            return createMediaArtist(item as Navidrome.Artist, childSort) as T;

        case ItemType.Playlist:
            return createMediaPlaylist(item as Navidrome.Playlist, childSort) as T;

        default:
            if (isRadio) {
                return createRadioItem(item as Navidrome.Radio) as T;
            } else {
                return createMediaItem(item as Navidrome.Song) as T;
            }
    }
}

export function createArtistAlbumsPager(artist: MediaArtist, albumSort?: SortParams): Pager<MediaAlbum> {
    const id = getMediaObjectId(artist);
    const allTracks = createArtistAllTracks(artist);
    const allTracksPager = new SimplePager<MediaAlbum>([allTracks]);
    const albumsPager = new NavidromeOffsetPager<MediaAlbum>(ItemType.Album, 'album', {
        album_artist_id: id,
        ...(albumSort
            ? {
                  _sort: albumSort.sortBy,
                  _order: albumSort.sortOrder === -1 ? 'DESC' : 'ASC',
              }
            : {
                  _sort: 'minYear',
                  _order: 'DESC',
              }),
    });
    return new WrappedPager(undefined, albumsPager, allTracksPager);
}

export function createPlaylistItemsPager(
    playlist: MediaPlaylist,
    itemSort?: SortParams
): Pager<MediaItem> {
    const id = getMediaObjectId(playlist);
    return new NavidromeOffsetPager(ItemType.Media, `playlist/${id}/tracks`, {
        playlist_id: id,
        ...(itemSort
            ? {
                  _sort: itemSort.sortBy,
                  _order: itemSort.sortOrder === -1 ? 'DESC' : 'ASC',
              }
            : {}),
    });
}

function createMediaItem(song: Navidrome.Song): MediaItem {
    const id = song.mediaFileId || song.id;
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.Direct,
        src: `navidrome:audio:${id}`,
        externalUrl: getExternalUrl(`album/${song.albumId}`),
        title: song.title,
        addedAt: parseDate(song.createdAt),
        artists: song.artist === '[Unknown Artist]' ? undefined : [song.artist],
        albumArtist: song.albumArtist === '[Unknown Artist]' ? undefined : song.albumArtist,
        album: song.album === '[Unknown Album]' ? undefined : song.album,
        duration: song.duration,
        track: song.trackNumber,
        position: song.playlistId ? Number(song.id) || 0 : undefined,
        disc: song.discNumber,
        rating: song.rating || 0,
        inLibrary: !!song.starred,
        year: song.year || undefined,
        playedAt: parseDate(song.playDate),
        playCount: song.playCount,
        genres: song.genres?.map((genre) => genre.name),
        thumbnails: createThumbnails(song.albumId),
        recording_mbid: song.mbzTrackId || undefined,
        release_mbid: song.mbzAlbumId || undefined,
        track_mbid: song.mbzReleaseTrackId || undefined,
        artist_mbids: song.mbzArtistId ? [song.mbzArtistId] : undefined,
        isrc: song.tags?.isrc?.[0],
        albumGain: song.rgAlbumGain,
        albumPeak: song.rgAlbumPeak,
        trackGain: song.rgTrackGain,
        trackPeak: song.rgTrackPeak,
        bitRate: song.bitRate,
        badge: song.suffix,
        container: song.suffix,
        unplayable: song.missing || undefined,
    };
}

function createRadioItem(radio: Navidrome.Radio): MediaItem {
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        src: `navidrome:radio:${radio.id}`,
        srcs: [radio.streamUrl],
        externalUrl: radio.homePageUrl,
        title: radio.name,
        addedAt: parseDate(radio.createdAt),
        duration: MAX_DURATION,
        playedAt: 0,
        isExternalMedia: true,
    };
}

function createMediaAlbum(album: Navidrome.Album): MediaAlbum {
    const album_id = album.id;
    return {
        itemType: ItemType.Album,
        src: `navidrome:album:${album_id}`,
        externalUrl: getExternalUrl(`album/${album_id}`),
        title: album.name,
        addedAt: parseDate(album.createdAt),
        artist: album.albumArtist,
        inLibrary: !!album.starred,
        rating: album.rating || 0,
        year: album.minYear || album.maxYear || undefined,
        playedAt: parseDate(album.playDate),
        playCount: album.playCount,
        genres: album.genres?.map((genre) => genre.name),
        pager: new NavidromeOffsetPager(ItemType.Media, 'song', {album_id, _sort: 'album'}),
        trackCount: album.songCount,
        thumbnails: createThumbnails(album_id),
        release_mbid: album.mbzAlbumId,
        artist_mbids: album.mbzAlbumArtistId ? [album.mbzAlbumArtistId] : undefined,
    };
}

function createMediaArtist(artist: Navidrome.Artist, albumSort?: SortParams): MediaArtist {
    const artist_id = artist.id;
    const hasThumbnails = Object.keys(artist).some((key) => /ImageUrl$/.test(key));

    const mediaArtist: Writable<SetOptional<MediaArtist, 'pager'>> = {
        itemType: ItemType.Artist,
        src: `navidrome:artist:${artist_id}`,
        externalUrl: getExternalUrl(`artist/${artist_id}`),
        title: artist.name,
        description: getTextFromHtml(artist.biography) || undefined,
        inLibrary: !!artist.starred,
        rating: artist.rating || 0,
        genres: artist.genres?.map((genre) => genre.name),
        thumbnails: hasThumbnails ? createThumbnails(artist_id) : undefined,
        artist_mbid: artist.mbzArtistId,
    };
    mediaArtist.pager = createArtistAlbumsPager(mediaArtist as MediaArtist, albumSort);
    return mediaArtist as MediaArtist;
}

function createMediaPlaylist(playlist: Navidrome.Playlist, itemSort?: SortParams): MediaPlaylist {
    const playlist_id = playlist.id;
    const src = `navidrome:playlist:${playlist_id}`;

    const mediaPlaylist: Writable<SetOptional<MediaPlaylist, 'pager'>> = {
        itemType: ItemType.Playlist,
        src: src,
        externalUrl: getExternalUrl(`playlist/${playlist_id}`),
        title: playlist.name,
        description: getTextFromHtml(playlist.comment),
        addedAt: parseDate(playlist.createdAt),
        duration: playlist.duration,
        trackCount: playlist.songCount,
        thumbnails: createThumbnails(playlist_id),
        isPinned: pinStore.isPinned(src),
        isOwn: playlist.ownerId === navidromeSettings.userId,
        owner: {
            name: playlist.ownerName,
        },
    };
    mediaPlaylist.pager = createPlaylistItemsPager(mediaPlaylist as MediaPlaylist, itemSort);
    return mediaPlaylist as MediaPlaylist;
}

function createThumbnails(id: string): Thumbnail[] | undefined {
    return id
        ? [
              createThumbnail(id, 240),
              createThumbnail(id, 360),
              createThumbnail(id, 480),
              createThumbnail(id, 800),
          ]
        : undefined;
}

function createThumbnail(id: string, width: number, height = width): Thumbnail {
    const {host} = navidromeSettings;
    const url = `${host}/rest/getCoverArt?id=${id}&size=${width}&{navidrome-credentials}`; // not a typo
    return {url, width, height};
}

function createArtistAllTracks(artist: MediaArtist): MediaAlbum {
    const id = getMediaObjectId(artist);
    return {
        itemType: ItemType.Album,
        src: `navidrome:all-tracks:${id}`,
        title: 'All Songs',
        artist: artist.title,
        thumbnails: artist.thumbnails,
        pager: createAllTracksPager(artist),
        trackCount: undefined,
        synthetic: true,
    };
}

function createAllTracksPager(artist: MediaArtist): Pager<MediaItem> {
    const id = getMediaObjectId(artist);
    return new NavidromeOffsetPager<MediaItem>(ItemType.Media, 'song', {
        artist_id: id,
        _sort: 'artist',
    });
}

function getExternalUrl(id: string): string {
    return `${navidromeSettings.host}/app/#/${id}/show`;
}

function getMediaObjectId(object: MediaObject): string {
    const [, , id] = object.src.split(':');
    return id;
}

function parseDate(date: string): number {
    const time = Date.parse(date) || 0;
    return time < 0 ? 0 : Math.round(time / 1000);
}
