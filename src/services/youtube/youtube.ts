import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import MediaItem from 'types/MediaItem';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import Pin, {Pinnable} from 'types/Pin';
import PlaybackType from 'types/PlaybackType';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import SimplePager from 'services/pagers/SimplePager';
import YouTubePager from './YouTubePager';
import youtubeApi from './youtubeApi';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
    clearAccessToken,
} from './youtubeAuth';
import youtubeSettings from './youtubeSettings';
import youtubeSources, {
    youtubePlaylistLayout,
    youtubePlaylists,
    youtubeSearch,
    youtubeVideoItems,
} from './youtubeSources';
import Credentials from './components/YouTubeCredentials';
import Login from './components/YouTubeLogin';

const serviceId: MediaServiceId = 'youtube';

const youtube: PublicMediaService = {
    id: serviceId,
    name: 'YouTube',
    icon: serviceId,
    url: 'https://www.youtube.com',
    credentialsUrl: 'https://console.cloud.google.com/apis/credentials',
    serviceType: ServiceType.PublicMedia,
    primaryMediaType: MediaType.Video,
    Components: {Credentials, Login},
    defaultNoScrobble: true,
    internetRequired: true,
    get credentialsLocked(): boolean {
        return youtubeSettings.credentialsLocked;
    },
    credentialsRequired: true,
    editablePlaylists: youtubePlaylists,
    root: youtubeSearch,
    sources: youtubeSources,
    addToPlaylist,
    canPin,
    compareForRating,
    createPlaylist,
    createSourceFromPin,
    editPlaylist,
    getPlaybackType,
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
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

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
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
            src: `${serviceId}:playlist:${playlist.id}`,
            title,
            itemType: ItemType.Playlist,
            pager: new SimplePager(),
            trackCount: items?.length,
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

function createSourceFromPin<T extends Pinnable>(pin: Pin): MediaSource<T> {
    if (pin.itemType !== ItemType.Playlist) {
        throw Error('Unsupported Pin type.');
    }
    return {
        title: pin.title,
        itemType: pin.itemType,
        id: pin.src,
        sourceId: `${serviceId}/pinned-playlist`,
        icon: 'pin',
        isPin: true,
        primaryItems: {
            layout: youtubePlaylistLayout,
        },
        secondaryItems: youtubeVideoItems,

        search(): Pager<T> {
            const [, , playlistId] = pin.src.split(':');
            return new YouTubePager('/playlists', {
                id: playlistId,
                part: 'snippet,contentDetails',
                fields: YouTubePager.playlistFields,
            });
        },
    } as MediaSource<T>;
}

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    try {
        const {src, title, description} = playlist;
        const [, , id] = src.split(':');
        await youtubeApi.put({
            path: 'playlists',
            params: {part: 'id,snippet,status'},
            body: {
                id,
                snippet: {title, description},
                status: {privacyStatus: playlist.public ? 'public' : 'private'},
            },
        });
        return playlist;
    } catch (err: any) {
        if (err.status === 401) {
            clearAccessToken();
        }
        throw err;
    }
}

async function getPlaybackType(): Promise<PlaybackType> {
    return PlaybackType.IFrame;
}
