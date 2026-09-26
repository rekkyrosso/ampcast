import {nanoid} from 'nanoid';
import {SetOptional, SetRequired, Writable} from 'type-fest';
import AlbumType from 'types/AlbumType';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaType from 'types/MediaType';
import Pager, {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import Thumbnail from 'types/Thumbnail';
import {getTextFromHtml, uniqBy} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {bestOf} from 'services/metadata';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import stationStore from 'services/internetRadio/stationStore';
import MusicKitPager, {MusicKitPlaylistItemsPager} from './MusicKitPager';
import {refreshToken} from './appleAuth';

type LibrarySong = Omit<AppleMusicApi.Song, 'type'> & {type: 'library-songs'};
type MusicVideo = Omit<AppleMusicApi.Song, 'type'> & {type: 'music-videos'};
type Station = Omit<AppleMusicApi.Station, 'type'> & {
    type: 'stations';
    attributes: Pick<
        SetRequired<AppleMusicApi.Song, 'attributes'>['attributes'],
        'durationInMillis' | 'artwork' | 'editorialNotes' | 'url' | 'playParams'
    > & {
        episodeNumber?: number;
        isLive: boolean;
        mediaKind: 'audio' | 'video';
        name: string;
    };
};
type LibraryMusicVideo = Omit<AppleMusicApi.Song, 'type'> & {type: 'library-music-videos'};
type LibraryArtist = Omit<AppleMusicApi.Artist, 'type'> & {type: 'library-artists'};
type LibraryAlbum = Omit<AppleMusicApi.Album, 'type'> & {type: 'library-albums'};
type LibraryPlaylist = Omit<AppleMusicApi.Playlist, 'type'> & {type: 'library-playlists'};

export type MusicKitItem =
    | AppleMusicApi.Song
    | LibrarySong
    | MusicVideo
    | LibraryMusicVideo
    | AppleMusicApi.Artist
    | LibraryArtist
    | AppleMusicApi.Album
    | LibraryAlbum
    | AppleMusicApi.Playlist
    | LibraryPlaylist
    | Station;

const serviceId: MediaServiceId = 'apple';
const webHost = 'https://music.apple.com';

export const musicKitParams: MusicKit.QueryParameters = {
    'include[songs]': 'artists,albums',
    'include[library-songs]': 'catalog,artists,albums',
    'include[albums]': 'artists',
    'include[library-albums]': 'catalog,artists',
    'include[library-artists]': 'catalog',
    'include[music-videos]': 'artists,albums',
    'include[library-music-videos]': 'catalog,artists,albums',
    'omit[resource:artists]': 'relationships',
};

export async function musicKitFetch<T = any>(
    href: string,
    params?: MusicKit.QueryParameters
): Promise<T> {
    const musicKit = MusicKit.getInstance();
    try {
        const response = await musicKit.api.music(href, params);
        return response;
    } catch (err: any) {
        const status = err?.data?.status;
        if (status === 401 || status === 403) {
            await refreshToken(); // this throws
            // We'll never get here.
            return musicKit.api.music(href, params);
        } else {
            throw err;
        }
    }
}

export function createMediaObjects<T extends MediaObject>(
    items: readonly MusicKitItem[],
    parent?: ParentOf<T>,
    offset = 0
): T[] {
    return items.map(
        (item, index) =>
            createMediaObject(
                item,
                parent,
                parent?.itemType === ItemType.Playlist && parent.isChart
                    ? offset + index + 1
                    : undefined
            ) as T
    );
}

export function createMediaObject<T extends MediaObject>(
    item: MusicKitItem,
    parent?: ParentOf<T>,
    position?: number
): T {
    switch (item.type) {
        case 'playlists':
        case 'library-playlists':
            return createMediaPlaylist(item, position) as T;

        case 'artists':
        case 'library-artists':
            return createMediaArtist(item) as T;

        case 'albums':
        case 'library-albums':
            return createMediaAlbum(item, position) as T;

        case 'songs':
        case 'library-songs':
        case 'music-videos':
        case 'library-music-videos':
            return createMediaItem(item, parent as ParentOf<MediaItem>, position) as T;

        case 'stations':
            return createRadioItem(item) as T;
    }
}

export function createNowPlayingItem(
    nowPlaying: MusicKit.MediaItem | MusicKit.TimedMetadata,
    station: PlaylistItem
): PlaylistItem {
    if (isTimedMetadata(nowPlaying)) {
        return {
            ...createFromTimedMetadata(nowPlaying, station),
            id: nanoid(),
        };
    } else if (nowPlaying.id === nowPlaying.container?.id) {
        return station;
    } else {
        return {
            ...createMediaItem(nowPlaying),
            id: nanoid(),
            src: `${serviceId}:songs:${nowPlaying.id}`,
            linearType: LinearType.MusicTrack,
            stationName: station.title,
            stationSrc: station.src,
        };
    }
}

export function createRelatedItemsPager<T extends MediaObject>(item: T): Pager<T> | undefined {
    const catalogId = item.apple?.catalogId;
    if (catalogId) {
        switch (item.itemType) {
            case ItemType.Album:
                return createRelatedAlbumsPager(item) as Pager<T>;

            case ItemType.Artist:
                return createViewPager('artists', catalogId, 'similar-artists');

            case ItemType.Playlist:
                return createViewPager('playlists', catalogId, 'more-by-curator');
        }
    }
}

function createRelatedAlbumsPager(album: MediaAlbum): Pager<MediaAlbum> | undefined {
    const catalogId = album.apple?.catalogId;
    if (catalogId) {
        const syntheticAlbumsPager = new SimpleMediaPager(async () => {
            const syntheticAlbums: MediaAlbum[] = [];
            const videosAlbum = createAlbumVideos(album);
            const videos = await fetchFirstPage(videosAlbum.pager, {
                keepAlive: true,
                suppressErrors: true,
            });
            if (videos.length > 0) {
                syntheticAlbums.push(videosAlbum);
            }
            return syntheticAlbums;
        });
        const albumsPager = createViewPager<MediaAlbum>('albums', catalogId, 'related-albums');
        return new WrappedPager(syntheticAlbumsPager, albumsPager);
    }
}

export function createSongsPager<T extends MediaItem>(song: T): Pager<T> {
    const songPager = new SimpleMediaPager(async () => [song]);
    const catalogId = song.apple?.catalogId;
    if (catalogId && song.mediaType !== MediaType.Video) {
        return new WrappedPager(
            undefined,
            songPager,
            new SimpleMediaPager<T>(async () => {
                const videosPager = createRelationshipPager<T>('songs', catalogId, 'music-videos');
                const radiosPager = createRelationshipPager<T>('songs', catalogId, 'station');
                const items = await Promise.all([
                    fetchFirstPage(videosPager, {suppressErrors: true}),
                    fetchFirstPage(radiosPager, {suppressErrors: true}),
                ]);
                return items.flat();
            })
        );
    } else {
        return songPager;
    }
}

function createMediaPlaylist(
    playlist: AppleMusicApi.Playlist | LibraryPlaylist,
    position?: number
): SetRequired<MediaPlaylist, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Playlist['attributes'] & {canEdit: boolean}>(
        playlist
    );
    const description = item.description?.standard || item.description?.short;
    const src = `${serviceId}:${playlist.type}:${playlist.id}`;
    const catalogId = getCatalogId(playlist);

    const mediaPlaylist: Writable<SetOptional<SetRequired<MediaPlaylist, 'apple'>, 'pager'>> = {
        src,
        position,
        itemType: ItemType.Playlist,
        externalUrl: item.url,
        title: item.name,
        description: getTextFromHtml(description, 1) || undefined,
        thumbnails: createThumbnails(item),
        trackCount: undefined,
        owner: item.curatorName ? {name: item.curatorName} : undefined,
        modifiedAt: Math.floor(new Date(item.lastModifiedDate).valueOf() / 1000) || undefined,
        unplayable: !item.playParams || undefined,
        isChart: item.isChart,
        isPinned: pinStore.isPinned(src),
        inLibrary: playlist.type.startsWith('library-') || undefined,
        apple: {catalogId},
        items: {droppable: item.canEdit},
        links: {
            self: true,
        },
    };
    mediaPlaylist.pager = new MusicKitPlaylistItemsPager(
        mediaPlaylist as MediaPlaylist,
        `${playlist.href!}/tracks`
    );
    return mediaPlaylist as SetRequired<MediaPlaylist, 'apple'>;
}

function createMediaArtist(
    artist: AppleMusicApi.Artist | LibraryArtist
): SetRequired<MediaArtist, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);
    const description = item.editorialNotes?.standard || item.editorialNotes?.short;
    const catalogId = getCatalogId(artist);

    return {
        itemType: ItemType.Artist,
        src: `${serviceId}:${artist.type}:${artist.id}`,
        externalUrl: item.url,
        title: item.name,
        description: getTextFromHtml(description, 1) || undefined,
        thumbnails: createThumbnails(item as any),
        genres: getGenres(item),
        pager: createArtistAlbumsPager(artist),
        apple: {catalogId},
        links: {
            self: !!catalogId,
        },
    };
}

function createMediaAlbum(
    album: AppleMusicApi.Album | LibraryAlbum,
    position?: number
): SetRequired<MediaAlbum, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Album['attributes']>(album);
    const src = `${serviceId}:${album.type}:${album.id}`;
    const description = item.editorialNotes?.standard || item.editorialNotes?.short;
    const catalogId = getCatalogId(album);
    const releaseDate = new Date(item.releaseDate);
    const isLibraryAlbum = album.type.startsWith('library-');
    const artists = getNamedArtists(album?.relationships?.artists.data);

    return {
        itemType: ItemType.Album,
        albumType: item.isCompilation
            ? AlbumType.Compilation
            : item.isSingle
              ? AlbumType.Single
              : undefined,
        src,
        position,
        externalUrl: item.url,
        title: item.name,
        description: getTextFromHtml(description, 1) || undefined,
        thumbnails: createThumbnails(item),
        artists: artists?.map((artist) => artist.attributes.name) || [
            album.attributes?.artistName || '',
        ],
        trackCount: item.trackCount,
        genres: getGenres(item),
        releasedAt: Math.round(releaseDate.getTime() / 1000) || undefined,
        year: releaseDate.getFullYear() || undefined,
        unplayable: !item.playParams || undefined,
        inLibrary: isLibraryAlbum || undefined,
        copyright: item?.copyright,
        explicit: item?.contentRating === 'explicit',
        shareLink: createShareLink('album', item.name, catalogId),
        apple: {catalogId},
        links: {
            self: !!catalogId,
            artists: artists?.map((artist) => getLink(artist)),
        },
        pager: new MusicKitPager(
            `${album.href!}/tracks`,
            {
                'include[songs]': 'artists,albums',
                'include[library-songs]': 'catalog,artists,albums',
                'include[albums]': 'artists',
                'include[library-artists]': 'catalog',
                'omit[resource:artists]': 'relationships',
            },
            {pageSize: 100}
        ),
    };
}

function createMediaItem(
    song: AppleMusicApi.Song | LibrarySong | MusicVideo | LibraryMusicVideo,
    parent?: ParentOf<MediaItem>,
    position?: number
): SetRequired<MediaItem, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Song['attributes']>(song);
    const {id, kind} = item.playParams || {
        id: song.id,
        kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
    };
    const src = `${serviceId}:${song.type}:${id}`;
    const description = item.editorialNotes?.standard || item.editorialNotes?.short;
    const isLibraryItem = song.type.startsWith('library-');
    const isPlaylistItem = parent?.itemType === ItemType.Playlist;
    const catalogId = getCatalogId(song);
    const catalogRelationships = getCatalog<AppleMusicApi.Song>(song)?.relationships;
    const album = catalogRelationships?.albums?.data[0] || song.relationships?.albums?.data[0];
    const albumArtists = getNamedArtists(album?.relationships?.artists?.data);
    const artists = getNamedArtists(
        catalogRelationships?.artists?.data || song.relationships?.artists.data
    );
    let artistNames: string[] | undefined = artists?.map((artist) => artist.attributes.name);
    if (String(artistNames) === 'Various Artists') {
        artistNames = undefined;
    }

    return {
        itemType: ItemType.Media,
        mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
        playbackType: PlaybackType.HLS,
        src,
        position,
        externalUrl: item.url,
        title: item.name,
        description: getTextFromHtml(description, 1) || undefined,
        thumbnails: createThumbnails(item),
        artists: artistNames || (item.artistName ? [item.artistName] : undefined),
        albumArtists:
            albumArtists?.map((artist) => artist.attributes.name) ||
            (album?.attributes?.artistName ? [album?.attributes.artistName] : undefined),
        album: item.albumName,
        duration: item.durationInMillis / 1000,
        genres: getGenres(item),
        disc: item.discNumber,
        track: item.trackNumber,
        year: new Date(item.releaseDate).getFullYear() || undefined,
        isrc: item.isrc,
        unplayable: !item.playParams || undefined,
        playedAt: 0,
        inLibrary: (isLibraryItem && !isPlaylistItem) || undefined,
        apple: {catalogId},
        explicit: item?.contentRating === 'explicit',
        shareLink: createShareLink(
            kind === 'musicVideo' ? 'music-video' : 'song',
            item.name,
            catalogId
        ),
        links: {
            self: catalogId
                ? `${serviceId}:${song.type.replace('library-', '')}:${catalogId}`
                : false,
            album: album ? getLink(album) : undefined,
            albumArtists: albumArtists?.map((artist) => getLink(artist)),
            artists: artistNames ? artists?.map((artist) => getLink(artist)) : undefined,
        },
    };
}

function createFromTimedMetadata(data: MusicKit.TimedMetadata, station?: MediaItem): MediaItem {
    const {storefrontAdamIds} = data;
    const catalogId = storefrontAdamIds[Object.keys(storefrontAdamIds)[0]] || '';
    const type = catalogId ? 'songs' : data.album ? 'track' : 'shows';
    const artist = data.performer || '';
    const id = catalogId || `${artist}-${data.title}`;
    // `links` should contain artwork URLs.
    // Sometimes they contain artwork from the previous track.
    // The new thumbnails are at the end.
    const thumbnails = uniqBy('description', data.links.slice().reverse())
        .filter((link) => link.description.startsWith('artworkURL_'))
        .map(({description, url}, index) => {
            const size = parseInt(description, 10) || 400 * index;
            return {url, width: size, height: size};
        });
    return {
        src: `${serviceId}:${type}:${id}`,
        linearType: type === 'shows' ? LinearType.Show : LinearType.MusicTrack,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.HLS,
        title: data.title,
        thumbnails: thumbnails || station?.thumbnails,
        artists: artist ? [artist] : undefined,
        album: data.album,
        stationName: station?.title,
        stationSrc: station?.src,
        duration: 0,
        playedAt: 0,
        unplayable: !catalogId || undefined,
        shareLink: type === 'shows' ? undefined : createShareLink('song', data.title, catalogId),
        apple: {catalogId},
    };
}

function createRadioItem(station: Station): SetRequired<MediaItem, 'apple'> {
    const attributes = station.attributes;
    const description = attributes.editorialNotes?.standard || attributes.editorialNotes?.short;
    const catalogId = getCatalogId(station);
    const src = `${serviceId}:${station.type}:${station.id}`;
    return {
        src,
        itemType: ItemType.Media,
        mediaType: attributes.mediaKind === 'video' ? MediaType.Video : MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: PlaybackType.HLS,
        isLivePlayback: attributes.isLive,
        externalUrl: attributes.url,
        title: attributes.name,
        description: getTextFromHtml(description, 1) || undefined,
        thumbnails: createThumbnails(attributes),
        duration: MAX_DURATION,
        playedAt: 0,
        apple: {catalogId},
        shareLink: createShareLink('station', attributes.name, catalogId),
        skippable: !attributes.isLive,
        isFavoriteStation: stationStore.isFavorite({src}),
    };
}

function createFromLibrary<T>(item: any): NonNullable<T> {
    const itemAttributes = item.attributes;
    const catalogAttributes = getCatalog(item)?.attributes as any;
    const attributes = bestOf(itemAttributes, catalogAttributes);
    attributes.description = catalogAttributes?.description || itemAttributes.description;
    return attributes;
}

function createShareLink(
    type: 'song' | 'music-video' | 'album' | 'playlist' | 'artist' | 'station',
    title: string,
    catalogId: string
): string | undefined {
    if (catalogId) {
        const musicKit = MusicKit.getInstance();
        const slug = title
            .replace(/[^\w\s]+/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        return `${webHost}/${musicKit.storefrontId}/${type}/${slug}/${catalogId}`;
    }
}

function createThumbnails({
    artwork,
}: {
    artwork?: AppleMusicApi.Artwork | undefined;
} = {}): Thumbnail[] | undefined {
    return artwork
        ? [
              createThumbnail(artwork, 240),
              createThumbnail(artwork, 360),
              createThumbnail(artwork, 480),
              createThumbnail(artwork, 800),
          ]
        : undefined;
}

function createThumbnail(
    artwork: MusicKit.Artwork | AppleMusicApi.Artwork,
    size: number
): Thumbnail {
    return {
        url: MusicKit.formatArtworkURL(artwork as MusicKit.Artwork, size, size),
        width: size,
        height: size,
    };
}

function createArtistAlbumsPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaAlbum> {
    const albumsPager = new MusicKitPager<MediaAlbum>(`${artist.href!}/albums`, {
        'include[albums]': 'artists',
        'include[library-albums]': 'catalog,artists',
        'include[library-artists]': 'catalog',
        'omit[resource:artists]': 'relationships',
    });
    if (artist.type === 'library-artists') {
        return albumsPager;
    }
    const topTracksAlbum = createArtistTopTracks(artist);
    const videosAlbum = createArtistVideos(artist);
    const radiosAlbum = createArtistRadios(artist);
    const syntheticAlbumsPager = new SimpleMediaPager<MediaAlbum>(async () => {
        const syntheticAlbums: MediaAlbum[] = [];
        const [topTracks, videos, radios] = await Promise.all(
            [topTracksAlbum, videosAlbum, radiosAlbum].map((album) =>
                fetchFirstPage(album.pager, {keepAlive: true, suppressErrors: true})
            )
        );
        if (topTracks.length > 0) {
            syntheticAlbums.push(topTracksAlbum);
        }
        if (videos.length > 0) {
            syntheticAlbums.push(videosAlbum);
        }
        if (radios.length > 0) {
            syntheticAlbums.push(radiosAlbum);
        }
        return syntheticAlbums;
    });
    return new WrappedPager(syntheticAlbumsPager, albumsPager);
}

function createArtistTopTracks(artist: AppleMusicApi.Artist): SetRequired<MediaAlbum, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

    return {
        itemType: ItemType.Album,
        src: `${serviceId}:top-tracks:${artist.id}`,
        title: 'Top Tracks',
        thumbnails: createThumbnails(item as any),
        artists: [item.name],
        genres: getGenres(item),
        pager: createViewPager(artist.type, artist.id, 'top-songs', {pageSize: 100, maxSize: 100}),
        synthetic: true,
        inLibrary: false,
        trackCount: undefined,
        apple: {catalogId: ''},
        links: {
            artists: [getLink(artist)],
        },
    };
}

function createArtistRadios(artist: AppleMusicApi.Artist): MediaAlbum {
    const item = createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);
    return {
        itemType: ItemType.Album,
        src: `${serviceId}:radios:${artist.id}`,
        title: 'Radios',
        thumbnails: createThumbnails(item as any),
        artists: [item.name],
        genres: getGenres(item),
        pager: createArtistRadiosPager(artist),
        synthetic: true,
        inLibrary: false,
        trackCount: undefined,
        apple: {catalogId: ''},
        links: {
            artists: [getLink(artist)],
        },
    };
}

function createArtistVideos(artist: AppleMusicApi.Artist): MediaAlbum {
    const item = createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);
    return {
        itemType: ItemType.Album,
        src: `${serviceId}:videos:${artist.id}`,
        title: 'Music Videos',
        thumbnails: createThumbnails(item as any),
        artists: [item.name],
        genres: getGenres(item),
        pager: createRelationshipPager(artist.type, artist.id, 'music-videos', {pageSize: 100}),
        synthetic: true,
        inLibrary: false,
        trackCount: undefined,
        apple: {catalogId: ''},
        links: {
            artists: [getLink(artist)],
        },
    };
}

function createAlbumVideos(album: MediaAlbum): MediaAlbum {
    const catalogId = album.apple?.catalogId || '';
    return {
        itemType: ItemType.Album,
        src: `${serviceId}:videos:${catalogId}`,
        title: 'Music Videos',
        thumbnails: album.thumbnails,
        pager: createViewPager('albums', catalogId, 'related-videos'),
        synthetic: true,
        inLibrary: false,
        trackCount: undefined,
        apple: {catalogId: ''},
        links: {
            artists: album.links?.artists,
        },
    };
}

function createArtistRadiosPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
    return new MusicKitPager(
        `/v1/catalog/{{storefrontId}}/stations?`,
        {ids: [`ra.a-${artist.id}`, `ra.${artist.id}`]},
        {pageSize: 0}
    );
}

export function createRelationshipPager<T extends MediaObject>(
    type: string,
    id: string,
    relationship: string,
    options?: Partial<PagerConfig<T>>
): Pager<T> {
    return new MusicKitPager(
        `/v1/catalog/{{storefrontId}}/${type}/${id}/${relationship}`,
        musicKitParams,
        {pageSize: 0, ...options}
    );
}

export function createViewPager<T extends MediaObject>(
    type: string,
    id: string,
    view: string,
    options?: Partial<PagerConfig<T>>
): Pager<T> {
    return new MusicKitPager(
        `/v1/catalog/{{storefrontId}}/${type}/${id}/view/${view}`,
        musicKitParams,
        {pageSize: 0, ...options}
    );
}

function getCatalog<T extends MusicKitItem>(item: MusicKit.Resource): T {
    return item.relationships?.catalog?.data?.[0];
}

function getCatalogId(item: MusicKit.Resource): string {
    if (item.type.startsWith('library-')) {
        let catalogId =
            item.attributes?.playParams?.[
                item.type === 'library-playlists' ? 'globalId' : 'catalogId'
            ];
        if (!catalogId) {
            catalogId = getCatalog(item)?.id;
        }
        return catalogId || '';
    } else {
        return item.id;
    }
}

function getGenres({genreNames = []}: {genreNames: string[]}): readonly string[] | undefined {
    return genreNames.filter((name) => name !== 'Music');
}

function getLink(item: MusicKit.Resource): string {
    const catalogId = getCatalogId(item);
    return catalogId ? `${serviceId}:${item.type.replace('library-', '')}:${catalogId}` : '';
}

function getNamedArtists(
    artists: readonly AppleMusicApi.Artist[] | undefined
): readonly SetRequired<AppleMusicApi.Artist, 'attributes'>[] | undefined {
    artists = artists?.filter((artist) => !!artist.attributes?.name);
    return artists?.length
        ? (artists as SetRequired<AppleMusicApi.Artist, 'attributes'>[])
        : undefined;
}

function isTimedMetadata(
    item: MusicKit.MediaItem | MusicKit.TimedMetadata
): item is MusicKit.TimedMetadata {
    return 'blob' in item && 'storefrontAdamIds' in item;
}
