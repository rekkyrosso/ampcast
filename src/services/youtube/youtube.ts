import getYouTubeID from 'get-youtube-id';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import MediaItem from 'types/MediaItem';
import ItemType from 'types/ItemType';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import Pin from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {getListens} from 'services/localdb/listens';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import {uniqBy} from 'utils';
import {
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    getGApiClient,
} from './youtubeAuth';
import YouTubePager from './YouTubePager';
import youtubeSettings from './youtubeSettings';

export const youtubeHost = `https://www.youtube.com`;
export const youtubeApiHost = `https://www.googleapis.com/youtube/v3`;

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Duration', 'Owner', 'Views'],
};

const youtubeLikes: MediaSource<MediaItem> = {
    id: 'youtube/likes',
    title: 'Likes',
    icon: 'thumbs-up',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    lockActionsStore: true,
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

const youtubeRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'youtube/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    mediaType: MediaType.Video,
    defaultHidden: true,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Owner', 'LastPlayed'],
    },

    search(): Pager<MediaItem> {
        return new SimpleMediaPager(async () =>
            uniqBy(
                getListens().filter((item) => item.src.startsWith('youtube:')),
                'src'
            )
        );
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

const youtube: PublicMediaService = {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    url: youtubeHost,
    serviceType: ServiceType.PublicMedia,
    primaryMediaType: MediaType.Video,
    get disabled(): boolean {
        return youtubeSettings.disabled;
    },
    defaultHidden: true,
    defaultNoScrobble: true,
    internetRequired: true,
    restrictedAccess: true,
    editablePlaylists: youtubePlaylists,
    roots: [
        {
            id: 'youtube/search/videos',
            title: 'Video',
            icon: 'search',
            itemType: ItemType.Media,
            mediaType: MediaType.Video,
            layout: defaultLayout,
            searchable: true,

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
        } as MediaSource<MediaItem>,
    ],
    sources: [youtubeLikes, youtubeRecentlyPlayed, youtubePlaylists],
    addToPlaylist,
    canRate: () => false,
    canStore: () => false,
    compareForRating: () => false,
    createPlaylist,
    createSourceFromPin,
    getPlaybackType,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default youtube;

async function addToPlaylist<T extends MediaItem>(
    playlist: MediaPlaylist,
    items: readonly T[]
): Promise<void> {
    if (items?.length) {
        const client = await getGApiClient();
        const [, , playlistId] = playlist.src.split(':');
        let error: any;
        for (const item of items) {
            const [, , videoId] = item.src.split(':');
            const {result, status, statusText} = await client.request({
                path: `${youtubeApiHost}/playlistItems`,
                method: 'POST',
                params: {part: 'snippet'},
                body: {
                    snippet: {
                        playlistId,
                        resourceId: {
                            kind: 'youtube#video',
                            videoId,
                        },
                    },
                },
            });
            if (!result && !error) {
                error = new Error(statusText || `Error (${status})`);
            }
        }
        if (error) {
            throw error;
        }
    }
}

async function createPlaylist<T extends MediaItem>(
    title: string,
    {description = '', isPublic, items}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const client = await getGApiClient();
    const {
        result: playlist,
        status,
        statusText,
    } = await client.request({
        path: `${youtubeApiHost}/playlists`,
        method: 'POST',
        params: {part: 'snippet,status'},
        body: {
            snippet: {title, description},
            status: {privacyStatus: isPublic ? 'public' : 'private'},
        },
    });
    if (!playlist) {
        throw Error(statusText || `Error (${status})`);
    }
    const mediaPlaylist: MediaPlaylist = {
        src: `youtube:playlist:${playlist.id}`,
        title,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
    };
    if (items) {
        await addToPlaylist(mediaPlaylist, items);
    }
    return mediaPlaylist;
}

function createSourceFromPin(pin: Pin): MediaSource<MediaPlaylist> {
    return {
        title: pin.title,
        itemType: ItemType.Playlist,
        id: pin.src,
        icon: 'pin',
        isPin: true,
        secondaryLayout: {...(defaultLayout as any), view: 'card compact'},

        search(): Pager<MediaPlaylist> {
            const [, , playlistId] = pin.src.split(':');
            return new YouTubePager('/playlists', {
                id: playlistId,
                part: 'snippet,contentDetails',
                fields: YouTubePager.playlistFields,
            });
        },
    };
}

async function getPlaybackType(): Promise<PlaybackType> {
    return PlaybackType.IFrame;
}
