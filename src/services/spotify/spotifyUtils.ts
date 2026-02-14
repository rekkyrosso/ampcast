import {nanoid} from 'nanoid';
import {SetOptional, Writable} from 'type-fest';
import AlbumType from 'types/AlbumType';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import {Logger, browser, getTextFromHtml} from 'utils';
import spotifyApi, {
    SpotifyAlbum,
    SpotifyArtist,
    SpotifyEpisode,
    SpotifyItem,
    SpotifyPlaylist,
    SpotifyTrack,
} from './spotifyApi';
import SpotifyPager, {SpotifyPage, SpotifyPlaylistItemsPager} from './SpotifyPager';
import spotifySettings from './spotifySettings';

const logger = new Logger('spotifyUtils');

export function createMediaObject<T extends MediaObject>(
    item: SpotifyItem,
    inLibrary?: boolean | undefined,
    position?: number
): T {
    switch (item.type) {
        case 'episode':
            return createMediaItemFromEpisode(item) as T;

        case 'artist':
            return createMediaArtist(item, inLibrary) as T;

        case 'album':
            return createMediaAlbum(item, inLibrary) as T;

        case 'playlist':
            return createMediaPlaylist(item, inLibrary) as T;

        case 'track':
            return createMediaItemFromTrack(item, inLibrary, position) as T;
    }
}

function createMediaItemFromEpisode(episode: SpotifyEpisode): MediaItem {
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.IFrame,
        src: episode.uri,
        externalUrl: episode.external_urls.spotify,
        title: episode.name,
        duration: episode.duration_ms / 1000,
        thumbnails: episode.images as Thumbnail[],
        unplayable: episode.is_playable === false ? true : undefined,
        playedAt: episode.played_at
            ? Math.floor((new Date(episode.played_at).getTime() || 0) / 1000)
            : 0,
        explicit: episode.explicit,
    };
}

function createMediaAlbum(album: SpotifyAlbum, inLibrary?: boolean | undefined): MediaAlbum {
    const externalUrl = album.external_urls.spotify;
    const releaseDate = new Date(album.release_date);
    const type = album.album_type;
    return {
        itemType: ItemType.Album,
        albumType:
            type === 'compilation'
                ? AlbumType.Compilation
                : type === 'single'
                  ? AlbumType.Single
                  : undefined,
        src: album.uri,
        externalUrl,
        shareLink: externalUrl,
        title: album.name,
        artist: album.artists.map((artist) => artist.name).join(', '),
        // genres: album.genres, // always an empty array
        year: releaseDate.getFullYear(),
        releasedAt: Math.round(releaseDate.getTime() / 1000),
        thumbnails: album.images as Thumbnail[],
        trackCount: album.total_tracks,
        pager: createAlbumTracksPager(album),
        inLibrary,
        copyright: album.copyrights
            ?.map((copyright) => copyright.text)
            .filter((text) => !!text)
            .join(' | '),
    };
}

function createMediaArtist(artist: SpotifyArtist, inLibrary?: boolean | undefined): MediaArtist {
    return {
        itemType: ItemType.Artist,
        src: artist.uri,
        externalUrl: artist.external_urls.spotify,
        title: artist.name,
        genres: artist.genres,
        thumbnails: artist.images as Thumbnail[],
        pager: createArtistAlbumsPager(artist),
        inLibrary,
    };
}

function createMediaPlaylist(
    playlist: SpotifyPlaylist,
    inLibrary?: boolean | undefined
): MediaPlaylist {
    const owned = playlist.owner.id === spotifySettings.userId;
    const trackCount = playlist.tracks.total;

    const mediaPlaylist: Writable<SetOptional<MediaPlaylist, 'pager'>> = {
        itemType: ItemType.Playlist,
        src: playlist.uri,
        externalUrl: playlist.external_urls.spotify,
        title: playlist.name,
        description: playlist.description ? getTextFromHtml(playlist.description) : undefined,
        thumbnails: playlist.images as Thumbnail[],
        trackCount,
        owner: {
            name: playlist.owner.display_name || '',
            url: playlist.owner.external_urls.spotify,
        },
        isChart: playlist.isChart,
        isPinned: pinStore.isPinned(playlist.uri),
        owned,
        editable: owned,
        inLibrary: owned ? false : inLibrary,
        public: !!playlist.public,
        items: owned
            ? {
                  deletable: true,
                  droppable: true,
                  moveable: trackCount <= SpotifyPlaylistItemsPager.MAX_SIZE_FOR_REORDER,
              }
            : undefined,
    };
    mediaPlaylist.pager = new SpotifyPlaylistItemsPager(mediaPlaylist as MediaPlaylist);
    return mediaPlaylist as MediaPlaylist;
}

export function createMediaItemFromTrack(
    track: SpotifyTrack,
    inLibrary?: boolean | undefined,
    position?: number
): MediaItem {
    const externalUrl = track.external_urls.spotify;
    const album = track.album;

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.IFrame,
        src: track.uri,
        externalUrl,
        shareLink: externalUrl,
        title: track.name,
        artists: track.artists?.map((artist) => artist.name),
        albumArtist: album?.artists.map((artist) => artist.name).join(', '),
        album: album?.name,
        duration: track.duration_ms / 1000,
        playedAt: track.played_at
            ? Math.floor((new Date(track.played_at).getTime() || 0) / 1000)
            : 0,
        position,
        nanoId: position == null ? undefined : nanoid(),
        genres: (album as any)?.genres,
        disc: track.disc_number,
        track: track.track_number,
        year: album ? new Date(album.release_date).getFullYear() || undefined : undefined,
        isrc: track.external_ids?.isrc,
        thumbnails: album?.images as Thumbnail[],
        unplayable: track.is_playable === false ? true : undefined,
        explicit: track.explicit,
        inLibrary,
    };
}

function createArtistAlbumsPager(artist: SpotifyArtist): Pager<MediaAlbum> {
    const topTracks = createArtistTopTracks(artist);
    const topTracksPager = new SimpleMediaPager<MediaAlbum>(async () => {
        try {
            // This uses a deprecated API call.
            // Keep it, because it's quite a nice feature, and may still work in some older clients.
            const items = await fetchFirstPage(topTracks.pager, {keepAlive: true});
            if (items.length === 0) {
                topTracks.pager.disconnect();
                return [];
            } else {
                return [topTracks];
            }
        } catch (err) {
            if (browser.isAmpcastApp) {
                // It should work here.
                // It may also work in some clients but we won't log the error.
                logger.error(err);
            }
            topTracks.pager.disconnect();
            return [];
        }
    });
    const albumsPager = new SpotifyPager<MediaAlbum>(
        async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getArtistAlbums(
                artist.id,
                offset,
                limit,
                'album,compilation,single'
            );
            return {items: items as SpotifyAlbum[], total, next};
        }
    );
    return new WrappedPager(topTracksPager, albumsPager);
}

function createArtistTopTracks(artist: SpotifyArtist): MediaAlbum {
    return {
        itemType: ItemType.Album,
        src: `spotify:top-tracks:${artist.id}`,
        title: 'Top Tracks',
        artist: artist.name,
        // thumbnails: artist.images as Thumbnail[], // Spotify branding rules
        pager: createTopTracksPager(artist),
        trackCount: undefined,
        synthetic: true,
    };
}

function createTopTracksPager(artist: SpotifyArtist): Pager<MediaItem> {
    return new SpotifyPager(
        async (): Promise<SpotifyPage> => {
            const {tracks} = await spotifyApi.getArtistTopTracks(artist.id);
            return {items: tracks as SpotifyTrack[], next: ''};
        },
        {pageSize: 30, maxSize: 100}
    );
}

function createAlbumTracksPager(album: SpotifyAlbum): Pager<MediaItem> {
    const tracks = album.tracks?.items;
    if (tracks && tracks.length === album.total_tracks) {
        return new SimpleMediaPager(async () => {
            const items = tracks.map((track) =>
                createMediaItemFromTrack({
                    ...track,
                    album: album as SpotifyApi.AlbumObjectSimplified,
                })
            );
            return items;
        });
    } else {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getAlbumTracks(album.id, offset, limit);
            return {
                items: items.map((item) => ({
                    ...item,
                    album: album as SpotifyApi.AlbumObjectSimplified,
                })),
                total,
                next,
            };
        });
    }
}
