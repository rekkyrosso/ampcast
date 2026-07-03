import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import PlaybackType from 'types/PlaybackType';
import {MAX_DURATION} from 'services/constants';
import {MusicCatalogRequiredError} from 'services/errors';
import {dispatchMetadataChanges} from 'services/metadata';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import stationStore from 'services/internetRadio/stationStore';
import WrappedPager from 'services/pagers/WrappedPager';
import LastFmPager from './LastFmPager';
import lastfmApi from './lastfmApi';
import lastfmSettings from './lastfmSettings';

const serviceId: MediaServiceId = 'lastfm';

export function createMediaObjects<T extends MediaObject>(
    itemType: T['itemType'],
    items: readonly LastFm.MediaObject[],
    playCountName: 'playcount' | 'userplaycount' = 'playcount',
    album?: LastFm.Album,
    inLibrary?: true | undefined
): readonly T[] {
    switch (itemType) {
        case ItemType.Artist:
            return items.map(
                (item) => createMediaArtist(item as LastFm.Artist, playCountName) as T
            );

        case ItemType.Album:
            return items.map((item) => createMediaAlbum(item as LastFm.Album, playCountName) as T);

        case ItemType.Media:
            return items.map(
                (item) =>
                    createMediaItem(item as LastFm.Track, playCountName, album, inLibrary) as T
            );

        default:
            return [];
    }
}

export function createMediaItem(
    track: LastFm.Track,
    playCountName: 'playcount' | 'userplaycount' = 'playcount',
    album?: LastFm.Album,
    inLibrary?: true | undefined
): MediaItem {
    const playedAt = track.date ? Number(track.date.uts) || 0 : 0;
    const rank = track['@attr']?.rank;
    const isNowPlaying = track['@attr']?.nowplaying === 'true';

    return {
        ...(createMediaObject(ItemType.Media, track, playCountName) as MediaItem),
        mediaType: MediaType.Audio,
        src:
            playedAt || isNowPlaying
                ? `${serviceId}:listen:${isNowPlaying ? 'now-playing' : playedAt}`
                : `${serviceId}:track:${nanoid()}`,
        artists: track.artist ? [track.artist.name] : undefined,
        album: album?.name || track.album?.['#text'],
        albumArtist: album?.artist.name,
        release_mbid: album?.mbid || track.album?.mbid,
        track_mbid: track.mbid,
        duration: Number(track.duration) || 0,
        track: rank ? Number(rank) || undefined : undefined,
        inLibrary: inLibrary || ('loved' in track ? !!Number(track.loved) : undefined),
        playedAt: isNowPlaying ? -1 : playedAt,
    };
}

function createMediaAlbum(
    album: LastFm.Album,
    playCountName: keyof LastFm.MediaObject
): MediaAlbum {
    return {
        ...(createMediaObject(ItemType.Album, album, playCountName) as MediaAlbum),
        src: `${serviceId}:album:${nanoid()}`,
        artist: album.artist.name,
        year: album.wiki?.published
            ? new Date(album.wiki.published).getFullYear() || undefined
            : undefined,
        pager: createAlbumTracksPager(album),
    };
}

function createMediaArtist(
    artist: LastFm.Artist,
    playCountName: keyof LastFm.MediaObject
): MediaArtist {
    return {
        ...(createMediaObject(ItemType.Artist, artist, playCountName) as MediaArtist),
        src: `${serviceId}:artist:${nanoid()}`,
        pager: createArtistAlbumsPager(artist),
    };
}

function createArtistTopTracks(artist: LastFm.Artist): MediaAlbum {
    return {
        itemType: ItemType.Album,
        title: 'Top Tracks',
        thumbnails: lastfmApi.createThumbnails(artist.image),
        src: `${serviceId}:top-tracks:${nanoid()}`,
        artist: artist.name,
        pager: createTopTracksPager(artist),
        trackCount: undefined,
        synthetic: true,
    };
}

function createArtistRadios(artist: LastFm.Artist): MediaAlbum {
    const artistName = artist.name;
    const radiosId = `${serviceId}:radios`;
    const radiosSrc = `${radiosId}:${artistName}`;
    const radioSrc = `${serviceId}:artist-radio:${artistName}`;
    const thumbnails = lastfmApi.createThumbnails(artist.image);

    const radio: MediaItem = {
        src: radioSrc,
        title: `${artistName} - Radio`,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: PlaybackType.Direct,
        artists: [artistName],
        duration: MAX_DURATION,
        thumbnails,
        playedAt: 0,
        skippable: true,
        isFavoriteStation: stationStore.isFavorite({src: radioSrc}),
        synthetic: true,
    };

    // Synthetic album that contains the radio.
    return {
        itemType: ItemType.Album,
        src: radiosSrc,
        title: 'Radios',
        artist: artistName,
        thumbnails,
        pager: new SimpleMediaPager(async () => {
            if (MusicCatalogRequiredError.canIgnore(radiosId)) {
                return [radio];
            } else {
                throw new MusicCatalogRequiredError(radiosId, () => {
                    // This is the callback function when the user clicks
                    // "proceed" to ignore the error message.

                    // Replace this pager with one that will show the radios.
                    dispatchMetadataChanges<MediaAlbum>({
                        match: (object) => object.src === radiosSrc,
                        values: {pager: new SimplePager([radio])},
                    });
                });
            }
        }),
        trackCount: undefined,
        synthetic: true,
    };
}

function createMediaObject(
    itemType: ItemType,
    item: LastFm.MediaObject,
    playCountName: keyof LastFm.MediaObject
): Partial<MediaObject> {
    return {
        itemType: itemType,
        title: item.name,
        playCount: Number(item[playCountName]) || undefined,
        globalPlayCount:
            playCountName === 'userplaycount' ? Number(item.playcount) || undefined : undefined,
        thumbnails: lastfmApi.createThumbnails(item.image),
        externalUrl: item.url || undefined,
    };
}

function createArtistAlbumsPager(artist: LastFm.Artist): Pager<MediaAlbum> {
    const topTracks = createArtistTopTracks(artist);
    const radios = createArtistRadios(artist);
    const syntheticAlbumsPager = new SimpleMediaPager(async () => [topTracks, radios]);
    const albumsPager = new LastFmPager<MediaAlbum>(
        {
            method: 'artist.getTopAlbums',
            artist: artist.name,
        },
        ({topalbums}: any) => {
            const attr = topalbums['@attr'];
            const items = topalbums.album;
            const total = Number(attr.total) || undefined;
            const atEnd = attr.page === attr.totalPages;
            return {items, total, atEnd, itemType: ItemType.Album};
        },
        {maxSize: 100, playCountName: 'userplaycount'}
    );
    return new WrappedPager(syntheticAlbumsPager, albumsPager);
}

function createAlbumTracksPager(album: LastFm.Album): Pager<MediaItem> {
    return new LastFmPager(
        {
            method: 'album.getInfo',
            album: album.name,
            artist: album.artist.name,
            user: lastfmSettings.userId,
        },
        ({album}: any) => {
            if (album.tracks) {
                const track = album.tracks.track;
                const tracks = track ? (Array.isArray(track) ? track : [track]) : [];
                const items = tracks.map((item: LastFm.Track) => ({
                    ...item,
                    album: {'#text': album.name},
                    image: item.image || album.image,
                }));
                const total = items.length;
                const atEnd = true;
                return {items, total, atEnd, itemType: ItemType.Media};
            } else {
                throw Error('No track info');
            }
        },
        {playCountName: 'userplaycount'},
        album
    );
}

function createTopTracksPager(artist: LastFm.Artist): Pager<MediaItem> {
    return new LastFmPager(
        {
            method: 'artist.getTopTracks',
            artist: artist.name,
        },
        ({toptracks}: any) => {
            const attr = toptracks['@attr'];
            const items = toptracks.track;
            const total = Number(attr.total) || undefined;
            const atEnd = attr.page === attr.totalPages;
            return {items, total, atEnd, itemType: ItemType.Media};
        },
        {pageSize: 10, maxSize: 10}
    );
}
