import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource, {AnyMediaSource, MediaSourceItems} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import {uniqBy} from 'utils';
import {getListens} from 'services/localdb/listens';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import YouTubePager from './YouTubePager';

export const youtubeVideos: MediaSourceItems = {
    layout: {
        view: 'card compact',
        card: {
            h1: 'Title',
            h2: 'Owner',
            h3: 'Views',
            data: 'Duration',
        },
        details: ['Title', 'Duration', 'Owner', 'Views'],
    },
};

export const youtubeSearch: MediaSource<MediaItem> = {
    id: 'youtube/search/videos',
    title: 'Video',
    icon: 'search',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    searchable: true,
    primaryItems: youtubeVideos,

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        if (q) {
            return new YouTubePager(
                '/search',
                {
                    q,
                    type: 'video',
                    videoCategoryId: '10', // music,
                    part: 'id',
                    fields: 'items(id(videoId))',
                },
                {maxSize: YouTubePager.maxPageSize, noCache: true}
            );
        } else {
            return new SimplePager();
        }
    },
};

const youtubeLikes: MediaSource<MediaItem> = {
    id: 'youtube/likes',
    title: 'Likes',
    icon: 'thumbs-up',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    lockActionsStore: true,
    defaultHidden: true,
    primaryItems: youtubeVideos,

    search(): Pager<MediaItem> {
        return new YouTubePager('/videos', {
            myRating: 'like',
            part: 'snippet,contentDetails,statistics',
            fields: YouTubePager.videoFields,
        });
    },
};

const youtubeRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'youtube/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    defaultHidden: true,
    primaryItems: youtubeVideos,

    search(): Pager<MediaItem> {
        return new SimpleMediaPager(async () =>
            uniqBy(
                'src',
                getListens().filter((item) => item.src.startsWith('youtube:'))
            )
        );
    },
};

export const youtubePlaylists: MediaSource<MediaPlaylist> = {
    id: 'youtube/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryItems: youtubeVideos,

    search(): Pager<MediaPlaylist> {
        return new YouTubePager('/playlists', {
            mine: 'true',
            part: 'snippet,contentDetails',
            fields: YouTubePager.playlistFields,
        });
    },
};

const youtubeSources: readonly AnyMediaSource[] = [
    youtubeLikes,
    youtubeRecentlyPlayed,
    youtubePlaylists,
];

export default youtubeSources;
