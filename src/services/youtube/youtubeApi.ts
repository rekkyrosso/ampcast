import {Except} from 'type-fest';
import getYouTubeID from 'get-youtube-id';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import youtubeSettings from './youtubeSettings';

interface YouTubeRequest {
    path: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
}

const youtubeHost = 'https://www.youtube.com';
const youtubeApiHost = 'https://www.googleapis.com/youtube/v3';

async function get<T = any>({headers, ...request}: Except<YouTubeRequest, 'method'>): Promise<T> {
    headers = {...headers, Accept: 'application/json'};
    return youtubeFetch({method: 'GET', headers, ...request});
}

async function post<T = any>({
    headers,
    body,
    ...request
}: Except<YouTubeRequest, 'method'>): Promise<T> {
    if (body) {
        headers = {...headers, 'Content-Type': 'application/json'};
        body = JSON.stringify(body);
    }
    return youtubeFetch({method: 'POST', headers, body, ...request});
}

async function youtubeFetch<T = any>({
    path,
    method,
    params,
    headers,
    body,
}: YouTubeRequest): Promise<T> {
    const token = youtubeSettings.token;
    if (!token) {
        throw Error('No access token');
    }

    path = params ? `${path}?${new URLSearchParams(params)}` : path;
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    const init: RequestInit = {
        method,
        headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
        },
        body,
    };

    const response = await fetch(`${youtubeApiHost}/${path}`, init);

    if (!response.ok) {
        throw response;
    }

    return response.json();
}

async function getVideoInfo(videoIdOrUrl: string): Promise<MediaItem> {
    const videoId = /youtu\.?be/.test(videoIdOrUrl) ? getYouTubeID(videoIdOrUrl) : videoIdOrUrl;
    if (!videoId) {
        throw Error('Video does not exist');
    }
    const url = getVideoUrl(videoId);
    const response = await fetch(`${youtubeHost}/oembed?url=${url}&format=json`);

    if (!response.ok) {
        switch (response.status) {
            case 401:
                throw Error('Embedding prevented by channel owner');

            case 403:
                throw Error('Private video');

            case 404:
                throw Error('Video does not exist');

            default:
                throw Error(`${response.statusText} (${response.status})`);
        }
    }

    const video = await response.json();

    return {
        itemType: ItemType.Media,
        mediaType: MediaType.Video,
        playbackType: PlaybackType.IFrame,
        src: `youtube:video:${videoId}`,
        externalUrl: url,
        title: video.title,
        aspectRatio: video.width / video.height || 16 / 9,
        duration: video.duration || 0,
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

function getVideoSrc(url = ''): string {
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

function getVideoUrl(videoId: string): string {
    return `${youtubeHost}/watch?v=${videoId}`;
}

const youtubeApi = {
    get,
    getVideoInfo,
    getVideoSrc,
    getVideoUrl,
    post,
};

export default youtubeApi;
