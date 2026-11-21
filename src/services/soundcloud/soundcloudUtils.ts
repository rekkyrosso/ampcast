import ItemType from 'types/ItemType';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PlaybackType from 'types/PlaybackType';
import Thumbnail from 'types/Thumbnail';
import {getTextFromHtml} from 'utils';
import {isBookmarked} from 'services/localdb/bookmarks';
import {createRadioStation} from 'services/mediaServices/mediaSources';
import pinStore from 'services/pins/pinStore';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import SoundCloudPager, {SoundCloudPlaylistItemsPager} from './SoundCloudPager';
import soundcloudSettings from './soundcloudSettings';

const serviceId: MediaServiceId = 'soundcloud';

export function createMediaObjects<T extends MediaObject>(
    items: readonly SoundCloud.MediaObject[]
): readonly T[] {
    return items.map((item) => createMediaObject(item));
}

export function createMediaObject<T extends MediaObject>(item: SoundCloud.MediaObject): T {
    switch (item.kind) {
        case 'user':
            return createMediaArtist(item) as T;

        case 'playlist':
            return createMediaPlaylist(item) as T;

        default:
            return createMediaItemFromTrack(item) as T;
    }
}

function createMediaArtist(user: SoundCloud.User): MediaArtist {
    return {
        itemType: ItemType.Artist,
        src: user.urn,
        externalUrl: user.permalink_url,
        title: user.username,
        description: user.description ? getTextFromHtml(user.description, 2) : undefined,
        thumbnails: createThumbnails(user.avatar_url),
        isBookmarked: isBookmarked(user.urn),
        followers: user.followers_count,
        addedAt: new Date(user.created_at).valueOf() || undefined,
        pager: createUserTracksPager(user),
        links: {
            self: true,
        },
    };
}

function createUserTracksPager(user: SoundCloud.User): Pager<MediaItem> {
    const isMe = user.id === soundcloudSettings.userId;
    const params = isMe ? '?access=playable,preview,blocked' : '';
    return new WrappedPager(
        new SimpleMediaPager(async () => [
            createRadioStation({
                src: `${serviceId}:artist-radio:${user.id}`,
                title: `${user.username} - Radio`,
                thumbnails: createThumbnails(user.avatar_url),
            }),
        ]),
        new SoundCloudPager(`/users/${user.urn}/tracks${params}`, {
            total: user.track_count,
        })
    );
}

function createMediaPlaylist(playlist: SoundCloud.Playlist): MediaPlaylist {
    const owned = playlist.user_id === soundcloudSettings.userId;
    return {
        itemType: ItemType.Playlist,
        src: playlist.urn,
        externalUrl: playlist.permalink_url,
        title: playlist.title,
        description: playlist.description ? getTextFromHtml(playlist.description) : undefined,
        genres: playlist.genre ? [playlist.genre] : undefined,
        thumbnails: createThumbnails(playlist.artwork_url),
        trackCount: playlist.track_count,
        globalLikes: playlist.likes_count,
        owner: {
            name: playlist.user.username,
            url: playlist.user.permalink_url,
        },
        // inLibrary
        isBookmarked: isBookmarked(playlist.urn),
        isPinned: pinStore.isPinned(playlist.urn),
        addedAt: new Date(playlist.created_at).valueOf() || undefined,
        modifiedAt: new Date(playlist.last_modified).valueOf() || undefined,
        owned,
        editable: owned,
        deletable: owned,
        public: playlist.sharing === 'public',
        pager: new SoundCloudPlaylistItemsPager(playlist),
        items: owned
            ? {
                  deletable: true,
                  droppable: true,
                  moveable: true,
              }
            : undefined,
        links: {
            self: true,
            owner: playlist.user.urn,
        },
    };
}

export function createMediaItemFromTrack(track: SoundCloud.Track): MediaItem {
    return {
        src: track.urn,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: track.access === 'playable' ? undefined : PlaybackType.IFrame,
        externalUrl: track.permalink_url,
        shareLink: track.permalink_url,
        title: track.title,
        description: track.description ? getTextFromHtml(track.description) : undefined,
        artists: [track.metadata_artist || track.user.username],
        duration: track.access === 'playable' ? track.duration / 1000 || 0 : 0,
        genres: track.genre ? [track.genre] : undefined,
        year: track.release_year || undefined,
        addedAt: new Date(track.created_at).valueOf() || undefined,
        playedAt: 0,
        // playCount: track.user_playback_count || 0, // Always `1`.
        globalLikes: track.favoritings_count,
        globalPlayCount: track.playback_count,
        inLibrary: track.user_favorite,
        isrc: track.isrc || undefined,
        bpm: track.bpm,
        thumbnails: createThumbnails(track.artwork_url),
        unplayable: track.access == 'blocked' || undefined,
        isBookmarked: isBookmarked(track.urn),
        owner: {
            name: track.user.username,
            url: track.user.permalink_url,
            label: 'Profile'
        },
        links: {
            self: true,
            artists: [track.user.urn],
        },
    };
}

function createThumbnails(url: string): readonly Thumbnail[] | undefined {
    if (url) {
        return [
            {
                url,
                width: 400,
                height: 400,
            },
        ];
    }
}
