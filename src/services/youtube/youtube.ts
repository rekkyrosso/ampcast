import getYouTubeID from 'get-youtube-id';
import MediaItem from 'types/MediaItem';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import {Pin} from 'types/Pin';
import SimplePager from 'services/pagers/SimplePager';
import {observeIsLoggedIn, isLoggedIn, login, logout} from './youtubeAuth';
import YouTubePager from './YouTubePager';

console.log('module::youtube');

export const youtubeHost = `https://www.youtube.com`;

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Duration', 'Owner'],
};

const youtubeLikes: MediaSource<MediaItem> = {
    id: 'youtube/likes',
    title: 'Likes',
    icon: 'thumbs-up',
    itemType: ItemType.Media,
    layout: defaultLayout,
    defaultHidden: true,

    search(): Pager<MediaItem> {
        return new YouTubePager('/videos', {
            myRating: 'like',
            part: 'snippet,contentDetails,statistics',
            fields: YouTubePager.videoFields,
        });
    },
};

const youtubePlaylists: MediaSource<MediaPlaylist> = {
    id: 'youtube/playlists',
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    secondaryLayout: defaultLayout,

    search(): Pager<MediaPlaylist> {
        return new YouTubePager('/playlists', {
            mine: 'true',
            part: 'snippet,contentDetails',
            fields: YouTubePager.playlistFields,
        });
    },
};

export function getYouTubeSrc(url = ''): string {
    if (url.startsWith('youtube:')) {
        return url;
    }
    const videoId = getYouTubeID(url);
    if (videoId) {
        return `youtube:video:${videoId}`;
    }
    if (/youtu\.?be/.test(url)) {
        const params = new URLSearchParams(new URL(url).search);
        const playlistId = params.get('list') || '';
        if (playlistId) {
            return `youtube:playlist:${playlistId}`;
        }
    }
    return '';
}

export function getYouTubeUrl(videoId: string): string {
    return `${youtubeHost}/watch?v=${videoId}`;
}

export async function getYouTubeVideoInfo(videoId: string): Promise<MediaItem> {
    const url = getYouTubeUrl(videoId);
    const response = await fetch(`${youtubeHost}/oembed?url=${url}&format=json`);

    if (!response.ok) {
        switch (response.status) {
            case 401:
                throw Error('Embedding prevented by channel owner.');

            case 403:
                throw Error('Private video.');

            case 404:
                throw Error('Video does not exist.');

            default:
                throw Error(`${response.statusText} (${response.status})`);
        }
    }

    const video = await response.json();

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Video,
        src: `youtube:video:${videoId}`,
        externalUrl: url,
        title: video.title,
        aspectRatio: video.width / video.height || 16 / 9,
        duration: 0,
        track: 0,
        thumbnails: [
            {
                url: video.thumbnail_url,
                width: video.thumbnail_width,
                height: video.thumbnail_height,
            },
        ],
        owner: {
            name: video.author_name,
            url: video.author_url,
        },
        playedAt: 0,
    };
}

const youtube: MediaService = {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    url: 'https://www.youtube.com/',
    defaultNoScrobble: true,
    roots: [
        {
            id: 'youtube/search/video',
            title: 'Video',
            icon: '',
            itemType: ItemType.Media,
            layout: defaultLayout,
            searchable: true,

            search<T extends MediaObject>({q = ''}: {q?: string} = {}): Pager<T> {
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
                    return new SimplePager<T>();
                }
            },
        },
    ],
    sources: [youtubeLikes, youtubePlaylists],

    canRate: () => false,
    canStore: () => false,
    createSourceFromPin,
    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default youtube;

function createSourceFromPin(pin: Pin): MediaSource<MediaItem> {
    return {
        title: pin.title,
        itemType: ItemType.Media,
        id: pin.src,
        icon: 'pin',
        isPin: true,
        layout: defaultLayout,

        search(): Pager<MediaItem> {
            const [, , playlistId] = pin.src.split(':');
            return new YouTubePager('/playlistItems', {
                playlistId,
                part: 'contentDetails',
                fields: 'items(contentDetails(videoId))',
            });
        },
    };
}
