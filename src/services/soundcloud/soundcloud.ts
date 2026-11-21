import Action from 'types/Action';
import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import Pager from 'types/Pager';
import PlaybackData from 'types/PlaybackData';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import {getMediaObjectId} from 'utils';
import {createRadioStation} from 'services/mediaServices/mediaSources';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import SoundCloudPager from './SoundCloudPager';
import soundcloudApi from './soundcloudApi';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './soundcloudAuth';
import soundcloudSources, {
    createRelatedPlaylistsSource,
    createSourceFromObject,
    createSourceFromPin,
    soundcloudMyPlaylists,
    soundcloudSearch,
} from './soundcloudSources';
import soundcloudSettings from './soundcloudSettings';
import {createMediaObject, createMediaObjects} from './soundcloudUtils';
import Credentials from './components/SoundCloudCredentials';
import Login from './components/SoundCloudLogin';

const serviceId: MediaServiceId = 'soundcloud';

const soundcloud: PublicMediaService = {
    id: serviceId,
    name: 'SoundCloud',
    icon: serviceId,
    url: 'https://soundcloud.com',
    serviceType: ServiceType.PublicMedia,
    internetRequired: true,
    secureContextRequired: true,
    browsable: true,
    Components: {Credentials, Login},
    get credentialsLocked(): boolean {
        return soundcloudSettings.credentialsLocked;
    },
    credentialsRequired: true,
    credentialsUrl: 'https://soundcloud.com/you/apps/new',
    iframeAudioPlayback: {
        // The SoundCloud player shows mainly interactive content.
        // Use CoverArt visualizer instead.
        showCoverArt: true,
    },
    editablePlaylists: soundcloudMyPlaylists,
    root: soundcloudSearch,
    sources: soundcloudSources,
    labels: {
        [Action.AddToLibrary]: 'Like on SoundCloud',
        [Action.RemoveFromLibrary]: 'Unlike on SoundCloud',
        [Action.Follow]: 'Follow on SoundCloud',
        [Action.Unfollow]: 'Unfollow on SoundCloud',
    },
    addMetadata,
    addToPlaylist,
    canFollow,
    canPin,
    canStore,
    compareForRating,
    createPlaylist,
    createRadioPager,
    createRelatedItemsPager,
    createRelatedPlaylistsSource,
    createSongsPager,
    createSourceFromObject,
    createSourceFromPin,
    editPlaylist,
    getMediaObject,
    getPlayableUrl,
    getPlaybackData,
    store,
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
};

export default soundcloud;

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (item.inLibrary !== undefined) {
        return item;
    }
    switch (item.itemType) {
        case ItemType.Media: {
            const track = await soundcloudApi.get<SoundCloud.Track>(`/tracks/${item.src}`);
            return {...item, inLibrary: track.user_favorite};
        }

        case ItemType.Artist:
        case ItemType.Playlist: {
            const params = 'linked_partitioning=true&limit=200';
            let href =
                item.itemType === ItemType.Playlist
                    ? `/me/likes/playlists?${params}`
                    : `/me/followings?${params}`;
            while (href) {
                const {collection, next_href} =
                    await soundcloudApi.get<SoundCloud.PaginatedResponse<SoundCloud.MediaObject>>(
                        href
                    );
                for (const entry of collection) {
                    if (entry.urn === item.src) {
                        return {...item, inLibrary: true};
                    }
                }
                href = next_href;
            }
            return {...item, inLibrary: false};
        }

        default:
            return item;
    }
}

async function addToPlaylist(
    playlist: MediaPlaylist,
    items: readonly MediaItem[],
    position = -1
): Promise<void> {
    const additions = items.map((item) => item.src);
    let tracks: SoundCloud.Track[] = [];
    let href = `/playlists/${playlist.src}/tracks?linked_partitioning=true&limit=1000&access=playable,preview,blocked`;
    while (href) {
        const {collection, next_href} =
            await soundcloudApi.get<SoundCloud.PaginatedResponse<SoundCloud.Track>>(href);
        if (collection) {
            tracks = tracks.concat(collection);
        }
        href = next_href;
    }
    const trackUrns = tracks.map((track) => track.urn);
    if (position >= 0 && position < tracks.length) {
        trackUrns.splice(position, 0, ...additions);
    } else {
        trackUrns.push(...additions);
    }
    await soundcloudApi.updatePlaylistTracks(playlist.src, trackUrns);
}

function canFollow(artist: MediaArtist, inListView?: boolean): boolean {
    return !inListView;
}

function canPin(item: MediaObject): boolean {
    return item.itemType === ItemType.Playlist;
}

function canStore<T extends MediaObject>(item: T, inListView?: boolean): boolean {
    switch (item.itemType) {
        case ItemType.Media:
            return true;

        case ItemType.Playlist:
            return !inListView;

        default:
            return false;
    }
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

async function createPlaylist<T extends MediaItem>(
    title: string,
    {description = '', isPublic = false, items}: CreatePlaylistOptions<T> = {}
): Promise<MediaPlaylist> {
    const playlist = await soundcloudApi.post<SoundCloud.Playlist>('/playlists', {
        title,
        description,
        sharing: isPublic ? 'public' : 'private',
        tracks: items?.map((item) => item.src),
    });
    return {
        title,
        description,
        src: playlist.urn,
        itemType: ItemType.Playlist,
        pager: new SimplePager(),
        trackCount: items?.length,
        public: isPublic,
    };
}

function createRadioPager(item: MediaItem): Pager<MediaItem> {
    if (item.linearType !== LinearType.Station) {
        throw Error('Not supported');
    }
    return new SimpleMediaPager(async () => {
        const [, radioType, id] = item.src.split(':');
        const type = radioType === 'song-radio' ? 'track' : 'artist';
        const playlist = await soundcloudApi.get<SoundCloud.Playlist>(
            `/system-playlists/${serviceId}:system-playlists:${type}-stations:${id}`
        );
        return createMediaObjects(playlist.tracks);
    });
}

function createRelatedItemsPager<T extends MediaObject>(item: T): Pager<T> | undefined {
    const [, type] = item.src.split(':');
    switch (item.itemType) {
        case ItemType.Artist:
        case ItemType.Media:
            return new SoundCloudPager(`/${type}/${item.src}/related?access=playable,preview`);
    }
}

function createSongsPager(item: MediaItem): Pager<MediaItem> {
    return new SimpleMediaPager(async () => {
        const id = getMediaObjectId(item);
        const radio = createRadioStation({
            src: `${serviceId}:song-radio:${id}`,
            title: `${item.title} - Radio`,
            thumbnails: item.thumbnails,
        });
        return [item, radio];
    });
}

async function editPlaylist(playlist: MediaPlaylist): Promise<MediaPlaylist> {
    await soundcloudApi.put(`/playlists/${playlist.src}`, {
        title: playlist.title,
        description: playlist.description,
        sharing: playlist.public ? 'public' : 'private',
    });
    return playlist;
}

async function getMediaObject<T extends MediaObject>(src: string): Promise<T> {
    const [, type, id] = src.split(':');
    let params = '';
    if (type === 'playlists') {
        params = '?show_tracks=false';
    }
    const item = await soundcloudApi.get<SoundCloud.MediaObject>(`/${type}/${id}${params}`);
    return createMediaObject(item);
}

function getPlayableUrl(item: MediaItem): string {
    return item?.srcs?.[0] || '';
}

async function getPlaybackData(item: MediaItem): Promise<PlaybackData> {
    return soundcloudApi.getPlaybackData(item);
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    switch (item.itemType) {
        case ItemType.Playlist:
        case ItemType.Media:
            if (inLibrary) {
                await soundcloudApi.like(item.src);
            } else {
                await soundcloudApi.unlike(item.src);
            }
            break;

        case ItemType.Artist:
            if (inLibrary) {
                await soundcloudApi.follow(item.src);
            } else {
                await soundcloudApi.unfollow(item.src);
            }
    }
}
