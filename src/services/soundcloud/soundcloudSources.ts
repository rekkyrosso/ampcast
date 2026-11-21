import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import Pin, {Pinnable} from 'types/Pin';
import {getItemTypeFromSrc} from 'utils';
import {createSingularMediaSource} from 'services/mediaServices/mediaSources';
import SimplePager from 'services/pagers/SimplePager';
import SoundCloudPager from './SoundCloudPager';
import SoundCloudRecentlyPlayedPager from './SoundCloudRecentlyPlayedPager';

const serviceId: MediaServiceId = 'soundcloud';

const soundcloudArtists: MediaSourceItems = {
    layout: {
        view: 'card small',
        card: {
            h1: 'Name',
            h2: 'GlobalStats',
        },
        details: ['Name', 'Description', 'Followers', 'GlobalPlayCount', 'GlobalLikes'],
    },
};

const soundcloudTracks: MediaSourceItems = {
    layout: {
        view: 'card',
        card: {
            h1: 'Title',
            h2: 'Artist',
            h3: 'GlobalStats',
            data: 'Duration',
        },
        details: ['Title', 'Artist', 'Duration', 'Genre', 'GlobalPlayCount', 'GlobalLikes'],
    },
};

const soundcloudPlaylists: MediaSourceItems = {
    layout: {
        details: ['Name', 'Owner', 'TrackCount', 'Genre', 'Progress', 'GlobalLikes'],
    },
};

const soundcloudPlaylistItems: MediaSourceItems = {
    layout: {
        view: 'details',
        card: soundcloudTracks.layout?.card,
        details: [
            'Position',
            'Title',
            'Artist',
            'Duration',
            'Genre',
            'GlobalPlayCount',
            'GlobalLikes',
        ],
    },
};

const soundcloudArtistTracks: MediaSourceItems = {
    layout: {
        ...soundcloudTracks.layout,
        view: 'card compact',
    },
};

export function createSourceFromObject<T extends MediaObject>(src: string): MediaSource<T> {
    const itemType = getItemTypeFromSrc(src);
    switch (itemType) {
        case ItemType.Playlist:
            return createSingularMediaSource<MediaPlaylist>({
                src,
                itemType,
                primaryItems: soundcloudPlaylists,
                secondaryItems: soundcloudPlaylistItems,
            }) as MediaSource<T>;

        case ItemType.Artist:
            return createSingularMediaSource<MediaArtist>({
                src,
                itemType,
                childItemType: ItemType.Media,
                primaryItems: soundcloudArtists,
                secondaryItems: soundcloudArtistTracks,
            }) as MediaSource<T>;

        default:
            return createSingularMediaSource<T>({
                src,
                itemType,
                primaryItems: soundcloudTracks,
            });
    }
}

export function createSourceFromPin<T extends Pinnable>(pin: Pin): MediaSource<T> {
    return createSingularMediaSource<MediaPlaylist>({
        src: pin.src,
        itemType: ItemType.Playlist,
        isPin: true,
        primaryItems: soundcloudPlaylists,
        secondaryItems: soundcloudPlaylistItems,
    }) as MediaSource<T>;
}

export function createRelatedPlaylistsSource<T extends MediaObject>(
    item: T
): MediaSource<MediaPlaylist> | undefined {
    switch (item.itemType) {
        case ItemType.Artist: {
            return {
                id: `${item.src}/related-playlists`,
                sourceId: `${serviceId}/playlists`,
                title: 'Related Playlists',
                icon: 'playlist',
                itemType: ItemType.Playlist,
                primaryItems: soundcloudPlaylists,
                secondaryItems: soundcloudPlaylistItems,

                search(): Pager<MediaPlaylist> {
                    return new SoundCloudPager(`/users/${item.src}/playlists`);
                },
            };
        }
    }
}

export const soundcloudSearch: MediaMultiSource = {
    id: `${serviceId}/search`,
    title: 'Search',
    icon: 'search',
    searchable: true,
    sources: [
        createSearch<MediaItem>(ItemType.Media, {
            id: 'tracks',
            title: 'Tracks',
            primaryItems: soundcloudTracks,
        }),
        createSearch<MediaArtist>(ItemType.Artist, {
            id: 'users',
            title: 'Artists',
            childItemType: ItemType.Media,
            primaryItems: soundcloudArtists,
            secondaryItems: soundcloudArtistTracks,
        }),
        createSearch<MediaPlaylist>(ItemType.Playlist, {
            id: 'playlists',
            title: 'Playlists',
            primaryItems: soundcloudPlaylists,
            secondaryItems: soundcloudPlaylistItems,
        }),
    ],
};

const soundcloudLikedTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/liked-tracks`,
    title: 'Liked Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionType: 'inLibrary',
    primaryItems: {
        ...soundcloudTracks,
        emptyMessage: "You don't have any liked tracks.",
    },

    search() {
        return new SoundCloudPager(
            '/me/likes/tracks',
            undefined,
            // Doesn't get automatically added in this response for some reason.
            (item) => (item.inLibrary = true)
        );
    },
};

const soundcloudLikedPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/liked-playlists`,
    title: 'Liked Playlists',
    icon: 'heart',
    itemType: ItemType.Playlist,
    lockActionType: 'inLibrary',
    primaryItems: {
        ...soundcloudPlaylists,
        emptyMessage: "You don't have any liked playlists.",
    },
    secondaryItems: soundcloudPlaylistItems,

    search() {
        return new SoundCloudPager('/me/likes/playlists');
    },
};

const soundcloudFollowedArtists: MediaSource<MediaArtist> = {
    id: `${serviceId}/followed-artists`,
    title: 'Followed Artists',
    icon: 'heart',
    itemType: ItemType.Artist,
    childItemType: ItemType.Media,
    lockActionType: 'inLibrary',
    primaryItems: {
        ...soundcloudArtists,
        emptyMessage: 'You are not following anyone.',
    },
    secondaryItems: soundcloudArtistTracks,

    search() {
        return new SoundCloudPager('/me/followings');
    },
};

const soundcloudRecentlyPlayed: MediaSource<MediaItem> = {
    id: `${serviceId}/recently-played`,
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    primaryItems: soundcloudTracks,

    search() {
        return new SoundCloudRecentlyPlayedPager();
    },
};

const soundcloudMyTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/my-tracks`,
    title: 'My Tracks',
    icon: 'audio',
    itemType: ItemType.Media,
    primaryItems: {
        ...soundcloudTracks,
        emptyMessage: "You haven't uploaded anything.",
    },

    search() {
        return new SoundCloudPager('/me/tracks');
    },
};

export const soundcloudMyPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/my-playlists`,
    title: 'My Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        ...soundcloudPlaylists,
        emptyMessage: "You haven't created any playlists.",
    },
    secondaryItems: soundcloudPlaylistItems,

    search() {
        return new SoundCloudPager('/me/playlists');
    },
};

const soundcloudSources: readonly AnyMediaSource[] = [
    soundcloudLikedTracks,
    soundcloudLikedPlaylists,
    soundcloudFollowedArtists,
    soundcloudRecentlyPlayed,
    soundcloudMyTracks,
    soundcloudMyPlaylists,
];

export default soundcloudSources;

function createSearch<T extends MediaObject>(
    itemType: T['itemType'],
    {id, ...props}: Except<MediaSource<T>, 'itemType' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        itemType,
        id: `${serviceId}/search/${id}`,
        icon: 'search',

        search({q = ''}: {q?: string} = {}): Pager<T> {
            q = encodeURIComponent(q.trim());
            if (q) {
                let href = '';
                switch (id) {
                    case 'tracks':
                        href = `/tracks?q=${q}&access=playable,preview`;
                        break;

                    case 'playlists':
                        href = `/playlists?q=${q}&show_tracks=false`;
                        break;

                    case 'users':
                        href = `/users?q=${q}`;
                        break;

                    default:
                        throw Error('Not supported');
                }
                return new SoundCloudPager(href, {maxSize: 250});
            } else {
                return new SimplePager();
            }
        },
    };
}
