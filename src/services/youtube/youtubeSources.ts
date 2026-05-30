import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import {uniqBy} from 'utils';
import {getListens} from 'services/localdb/listens';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import YouTubePager from './YouTubePager';

const serviceId: MediaServiceId = 'youtube';

export const youtubePlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Description',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['Name', 'Description', 'TrackCount', 'Progress'],
};

const youtubeVideoItems: MediaSourceItems = {
    layout: {
        view: 'card',
        card: {
            h1: 'Title',
            h2: 'Owner',
            h3: 'Views',
            data: 'Duration',
        },
        details: ['Title', 'Duration', 'Owner', 'Views'],
    },
};

export const youtubePlaylistItems: MediaSourceItems = {
    layout: {
        ...youtubeVideoItems.layout,
        view: 'card small',
        details: ['Position', 'Title', 'Duration', 'Owner', 'Views'],
    },
    sort: {
        defaultSort: {
            sortBy: 'Position',
            sortOrder: 1,
        },
    },
};

export const youtubeSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>('video', {
            title: 'Videos',
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            primaryItems: youtubeVideoItems,
        }),
        createSearch<MediaPlaylist>('playlist', {
            title: 'Playlists',
            itemType: ItemType.Playlist,
            primaryItems: {
                layout: youtubePlaylistLayout,
            },
            secondaryItems: youtubePlaylistItems,
        }),
    ],
};

const youtubeLikes: MediaSource<MediaItem> = {
    id: `${serviceId}/likes`,
    title: 'Likes',
    icon: 'thumbs-up',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    lockActionsStore: true,
    defaultHidden: true,
    primaryItems: youtubeVideoItems,

    search(): Pager<MediaItem> {
        return new YouTubePager('/videos', {
            myRating: 'like',
            part: 'snippet,contentDetails,statistics',
            fields: YouTubePager.videoFields,
        });
    },
};

const youtubeRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    defaultHidden: true,
    primaryItems: youtubeVideoItems,

    search(): Pager<MediaItem> {
        return new SimpleMediaPager(async () =>
            uniqBy(
                'src',
                getListens().filter((item) => item.src.startsWith(`${serviceId}:`))
            )
        );
    },
};

export const youtubePlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: youtubePlaylistLayout,
    },
    secondaryItems: youtubePlaylistItems,

    search(): Pager<MediaPlaylist> {
        return new YouTubePager('/playlists', {
            mine: 'true',
            part: 'snippet,contentDetails,status',
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

function createSearch<T extends MediaObject>(
    type: 'video' | 'playlist',
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: `${serviceId}/search/${type}s`,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            if (q) {
                const params: Record<string, string> = {type, q};
                if (type === 'video') {
                    params.videoCategoryId = '10';
                }
                return new YouTubePager('/search', params, {
                    maxSize: YouTubePager.maxPageSize,
                    noCache: true,
                });
            } else {
                return new SimplePager();
            }
        },
    };
}
