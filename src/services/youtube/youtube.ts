import MediaItem from 'types/MediaItem';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import SimplePager from 'services/SimplePager';
import {createEmptyMediaObject} from 'utils';
import {observeIsLoggedIn, login, logout} from './youtubeAuth';
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
        throw response;
    }

    const video = await response.json();

    return {
        ...createEmptyMediaObject(ItemType.Media),
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
    };
}

const youtube: MediaService = {
    id: 'youtube',
    title: 'YouTube',
    icon: 'youtube',
    sources: [youtubeLikes, youtubePlaylists],
    searches: [
        {
            id: 'youtube/search/video',
            title: 'Video',
            icon: '',
            itemType: ItemType.Media,
            layout: defaultLayout,
            searchable: true,

            search<T extends MediaObject>(q: string): Pager<T> {
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

    observeIsLoggedIn,
    login,
    logout,
};

export default youtube;
