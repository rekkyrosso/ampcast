import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import {parseISO8601} from 'utils';
import pinStore from 'services/pins/pinStore';
import youtube from './youtube';
import youtubeApi from './youtubeApi';
import YouTubePager from './YouTubePager';

export function createMediaPlaylist(playlist: gapi.client.youtube.Playlist): MediaPlaylist {
    const src = `youtube:playlist:${playlist.id}`;
    return {
        src,
        itemType: ItemType.Playlist,
        externalUrl: `${youtube.url}/playlist?list=${playlist.id}`,
        title: playlist.snippet?.title || playlist.id!,
        description: playlist.snippet?.description,
        thumbnails: createThumbnails(playlist.snippet?.thumbnails),
        trackCount: playlist.contentDetails?.itemCount,
        owner: createOwner(playlist.snippet!),
        pager: createPlaylistItemsPager(playlist.id!),
        isPinned: pinStore.isPinned(src),
        public: playlist.status?.privacyStatus === 'public',
        owned: true,
        editable: true,
        addedAt: parseDate(playlist.snippet?.publishedAt),
    };
}

export function createMediaItem(video: gapi.client.youtube.Video): MediaItem {
    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Video,
        playbackType: PlaybackType.IFrame,
        src: `youtube:video:${video.id}`,
        externalUrl: youtubeApi.getVideoUrl(video.id!),
        title: video.snippet?.title || video.id!,
        duration: parseISO8601(video.contentDetails?.duration || ''),
        thumbnails: createThumbnails(video.snippet?.thumbnails),
        owner: createOwner(video.snippet!),
        globalLikes: parseNumber(video.statistics?.likeCount),
        globalPlayCount: parseNumber(video.statistics?.viewCount),
        playedAt: 0,
    };
}

function createOwner({
    channelId = '',
    channelTitle = '',
}: {
    channelId?: string;
    channelTitle?: string;
}): MediaItem['owner'] {
    return channelId
        ? {
              name: channelTitle,
              url: `${youtube.url}/channel/${channelId}`,
          }
        : undefined;
}

function createPlaylistItemsPager(playlistId: string): Pager<MediaItem> {
    return new YouTubePager('/playlistItems', {
        playlistId,
        part: 'contentDetails',
        fields: 'items(contentDetails(videoId))',
    });
}

function createThumbnails(
    thumbnails: gapi.client.youtube.ThumbnailDetails | undefined
): Thumbnail[] | undefined {
    if (thumbnails) {
        return Object.keys(thumbnails).map(
            (sizeName) =>
                thumbnails[sizeName as keyof gapi.client.youtube.ThumbnailDetails] as Thumbnail
        );
    }
}

function parseNumber(value: string | undefined): number | undefined {
    if (value == null || isNaN(Number(value))) {
        return undefined;
    }
    return Number(value);
}

function parseDate(date = ''): number {
    const time = Date.parse(date) || 0;
    return time < 0 ? 0 : Math.round(time / 1000);
}
