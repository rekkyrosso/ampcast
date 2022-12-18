import MediaItem from 'types/MediaItem';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
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
    icon: 'playlists',
    itemType: ItemType.Playlist,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'TrackCount', 'Owner'],
    },
    secondaryLayout: defaultLayout,

    search(): Pager<MediaPlaylist> {
        return new YouTubePager('/playlists', {
            mine: 'true',
            part: 'snippet,contentDetails',
            fields: YouTubePager.playlistFields,
        });
    },
};

export async function getYouTubeVideoInfo(videoId: string): Promise<MediaItem> {
    const url = `${youtubeHost}/watch?v=${videoId}`;
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

    observeIsLoggedIn,
    isLoggedIn,
    login,
    logout,
};

export default youtube;
