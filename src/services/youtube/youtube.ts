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
import {browser, uniqBy} from 'utils';
import {
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    clearAccessToken,
} from './youtubeAuth';
import YouTubePager from './YouTubePager';
import youtubeSettings from './youtubeSettings';
import youtubeApi from './youtubeApi';
import Credentials from './components/YouTubeCredentials';
import Login from './components/YouTubeLogin';

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Duration', 'Owner', 'Views'],
};

const youtubeSearch: MediaSource<MediaItem> = {
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

const youtube: PublicMediaService = {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    url: 'https://www.youtube.com',
    credentialsUrl: 'https://console.cloud.google.com/apis/credentials',
    serviceType: ServiceType.PublicMedia,
    primaryMediaType: MediaType.Video,
    Components: {Credentials, Login},
    get disabled(): boolean {
        return youtubeSettings.disabled;
    },
    defaultHidden: true,
    defaultNoScrobble: true,
    internetRequired: true,
    get credentialsRequired(): boolean {
        return youtubeSettings.credentialsRequired;
    },
    restrictedAccess: location.host === 'ampcast.app' || browser.isElectron,
    editablePlaylists: youtubePlaylists,
    root: youtubeSearch,
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
        const [, , playlistId] = playlist.src.split(':');
        let error: any;
        for (const item of items) {
            const [, , videoId] = item.src.split(':');
            try {
                await youtubeApi.post({
                    path: 'playlistItems',
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
            } catch (err: any) {
                if (err.status === 401) {
                    clearAccessToken();
                    throw err;
                }
                if (!error) {
                    error = err;
                }
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
    try {
        const playlist = await youtubeApi.post({
            path: 'playlists',
            params: {part: 'snippet,status'},
            body: {
                snippet: {title, description},
                status: {privacyStatus: isPublic ? 'public' : 'private'},
            },
        });
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
    } catch (err: any) {
        if (err.status === 401) {
            clearAccessToken();
        }
        throw err;
    }
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
