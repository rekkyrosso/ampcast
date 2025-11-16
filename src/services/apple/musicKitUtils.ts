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
import MediaType from 'types/MediaType';
import Pager from 'types/Pager';
import ParentOf from 'types/ParentOf';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import Thumbnail from 'types/Thumbnail';
import {getTextFromHtml, Logger, uniqBy} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {bestOf} from 'services/metadata';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import MusicKitPager from './MusicKitPager';

const logger = new Logger('MusicKitUtils');

const webHost = 'https://music.apple.com';

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

export function createMediaObjects<T extends MediaObject>(
    items: readonly MusicKitItem[],
    parent?: ParentOf<T>
): T[] {
    return items.map((item) => createMediaObject(item, parent) as T);
}

export function createMediaObject<T extends MediaObject>(
    item: MusicKitItem,
    parent?: ParentOf<T>
): T {
    switch (item.type) {
        case 'playlists':
        case 'library-playlists':
            return createMediaPlaylist(item) as T;

        case 'artists':
        case 'library-artists':
            return createMediaArtist(item) as T;

        case 'albums':
        case 'library-albums':
            return createMediaAlbum(item) as T;

        case 'songs':
        case 'library-songs':
        case 'music-videos':
        case 'library-music-videos':
            return createMediaItem(item, parent as ParentOf<MediaItem>) as T;

        case 'stations':
            return createRadioItem(item) as T;
    }
}

export async function createNowPlayingItem(
    nowPlaying: MusicKit.MediaItem | MusicKit.TimedMetadata,
    station: PlaylistItem
): Promise<PlaylistItem> {
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
            src: `apple:songs:${nowPlaying.id}`,
            linearType: LinearType.MusicTrack,
            stationName: station.title,
        };
    }
}

function createMediaPlaylist(
    playlist: AppleMusicApi.Playlist | LibraryPlaylist
): SetRequired<MediaPlaylist, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Playlist['attributes']>(playlist);
    const description = item.description?.standard || item.description?.short;
    const src = `apple:${playlist.type}:${playlist.id}`;
    const catalogId = getCatalogId(playlist);

    const mediaPlaylist: Writable<SetOptional<SetRequired<MediaPlaylist, 'apple'>, 'pager'>> = {
        src,
        itemType: ItemType.Playlist,
        externalUrl: item.url,
        title: item.name,
        description: description ? getTextFromHtml(description) : undefined,
        thumbnails: createThumbnails(item),
        trackCount: undefined,
        owner: item.curatorName ? {name: item.curatorName} : undefined,
        modifiedAt: Math.floor(new Date(item.lastModifiedDate).valueOf() / 1000) || undefined,
        unplayable: !item.playParams || undefined,
        isChart: item.isChart,
        isPinned: pinStore.isPinned(src),
        inLibrary: playlist.type.startsWith('library-') || undefined,
        apple: {catalogId},
    };
    mediaPlaylist.pager = new MusicKitPager(
        `${playlist.href!}/tracks`,
        {'include[library-songs]': 'catalog'},
        {pageSize: 100, maxSize: item.isChart ? 100 : undefined},
        mediaPlaylist as MediaPlaylist
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
        src: `apple:${artist.type}:${artist.id}`,
        externalUrl: item.url,
        title: item.name,
        description: description ? getTextFromHtml(description) : undefined,
        thumbnails: createThumbnails(item as any),
        genres: getGenres(item),
        pager: createArtistAlbumsPager(artist),
        apple: {catalogId},
    };
}

function createMediaAlbum(
    album: AppleMusicApi.Album | LibraryAlbum
): SetRequired<MediaAlbum, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Album['attributes']>(album);
    const src = `apple:${album.type}:${album.id}`;
    const description = item.editorialNotes?.standard || item.editorialNotes?.short;
    const catalogId = getCatalogId(album);
    const releaseDate = new Date(item.releaseDate);

    const mediaAlbum: Writable<SetOptional<SetRequired<MediaAlbum, 'apple'>, 'pager'>> = {
        itemType: ItemType.Album,
        albumType: item.isCompilation
            ? AlbumType.Compilation
            : item.isSingle
            ? AlbumType.Single
            : undefined,
        src,
        externalUrl: item.url,
        title: item.name,
        description: description ? getTextFromHtml(description) : undefined,
        thumbnails: createThumbnails(item),
        artist: item.artistName,
        trackCount: item.trackCount,
        genres: getGenres(item),
        releasedAt: Math.round(releaseDate.getTime() / 1000) || undefined,
        year: releaseDate.getFullYear() || undefined,
        unplayable: !item.playParams || undefined,
        inLibrary: album.type.startsWith('library-') || undefined,
        copyright: item?.copyright,
        explicit: item?.contentRating === 'explicit',
        shareLink: createShareLink('album', item.name, catalogId),
        apple: {catalogId},
    };
    mediaAlbum.pager = new MusicKitPager(
        `${album.href!}/tracks`,
        {'include[library-songs]': 'catalog'},
        {pageSize: 100},
        mediaAlbum as MediaAlbum
    );
    return mediaAlbum as SetRequired<MediaAlbum, 'apple'>;
}

function createMediaItem(
    song: AppleMusicApi.Song | LibrarySong | MusicVideo | LibraryMusicVideo,
    parent?: ParentOf<MediaItem>
): SetRequired<MediaItem, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Song['attributes']>(song);
    const {id, kind} = item.playParams || {
        id: song.id,
        kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
    };
    const src = `apple:${song.type}:${id}`;
    const description = item.editorialNotes?.standard || item.editorialNotes?.short;
    const isLibraryItem = song.type.startsWith('library-');
    const isPlaylistItem = parent?.itemType === ItemType.Playlist;
    const catalogId = getCatalogId(song);

    const mediaItem: Writable<SetRequired<MediaItem, 'apple'>> = {
        itemType: ItemType.Media,
        mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
        playbackType: PlaybackType.HLS,
        src,
        externalUrl: item.url,
        title: item.name,
        description: description ? getTextFromHtml(description) : undefined,
        thumbnails: createThumbnails(item),
        artists: [item.artistName],
        albumArtist: parent?.itemType === ItemType.Album ? parent.artist : undefined,
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
    };
    return mediaItem;
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
        src: `apple:${type}:${id}`,
        linearType: type === 'shows' ? LinearType.Show : LinearType.MusicTrack,
        itemType: ItemType.Media,
        mediaType: MediaType.Audio,
        playbackType: PlaybackType.HLS,
        title: data.title,
        thumbnails: thumbnails || station?.thumbnails,
        artists: artist ? [artist] : undefined,
        album: data.album,
        stationName: station?.title,
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

    const mediaItem: Writable<SetRequired<MediaItem, 'apple'>> = {
        src: `apple:${station.type}:${station.id}`,
        itemType: ItemType.Media,
        mediaType: attributes.mediaKind === 'video' ? MediaType.Video : MediaType.Audio,
        linearType: LinearType.Station,
        playbackType: PlaybackType.HLS,
        isLivePlayback: attributes.isLive,
        externalUrl: attributes.url,
        title: attributes.name,
        description: description ? getTextFromHtml(description) : undefined,
        thumbnails: createThumbnails(attributes),
        duration: MAX_DURATION,
        playedAt: 0,
        apple: {catalogId},
        shareLink: createShareLink('station', attributes.name, catalogId),
        skippable: !attributes.isLive,
    };
    return mediaItem;
}

function createFromLibrary<T>(item: any): NonNullable<T> {
    return bestOf(item.attributes, getCatalog(item)?.attributes);
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
        'include[library-albums]': 'catalog',
    });
    if (artist.type.startsWith('library-')) {
        return albumsPager;
    }
    const topTracks = createArtistTopTracks(artist);
    const videos = createArtistVideos(artist);
    const topPager = new SimpleMediaPager<MediaAlbum>(async () => {
        try {
            const items = await fetchFirstPage(videos.pager, {keepAlive: true});
            return items.length === 0 ? [topTracks] : [topTracks, videos];
        } catch (err) {
            logger.error(err);
            return [topTracks];
        }
    });
    return new WrappedPager(topPager, albumsPager);
}

function createArtistTopTracks(
    artist: AppleMusicApi.Artist | LibraryArtist
): SetRequired<MediaAlbum, 'apple'> {
    const item = createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

    return {
        itemType: ItemType.Album,
        src: `apple:top-tracks:${artist.id}`,
        title: 'Top Tracks',
        thumbnails: createThumbnails(item as any),
        artist: item.name,
        genres: getGenres(item),
        pager: createTopTracksPager(artist),
        synthetic: true,
        inLibrary: false,
        trackCount: undefined,
        apple: {catalogId: ''},
    };
}

function createArtistVideos(artist: AppleMusicApi.Artist | LibraryArtist): MediaAlbum {
    const item = createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

    return {
        itemType: ItemType.Album,
        src: `apple:videos:${artist.id}`,
        title: 'Music Videos',
        thumbnails: createThumbnails(item as any),
        artist: item.name,
        genres: getGenres(item),
        pager: createVideosPager(artist),
        synthetic: true,
        inLibrary: false,
        trackCount: undefined,
        apple: {catalogId: ''},
    };
}

function createTopTracksPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
    return createArtistViewPager(artist, 'top-songs');
}

function createVideosPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
    return createArtistViewPager(artist, 'top-music-videos');
}

function createArtistViewPager(
    artist: AppleMusicApi.Artist | LibraryArtist,
    view: string
): Pager<MediaItem> {
    return new MusicKitPager(
        artist.href!,
        {
            [`limit[artists:${view}]`]: 30,
            views: view,
        },
        {maxSize: 100, pageSize: 0},
        undefined,
        (response: any) => {
            const result = response.data[0]?.views?.[view] || response;
            const items = result.data || [];
            const nextPageUrl = result.next;
            const total = result.meta?.total;
            return {items, total, nextPageUrl};
        }
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

function isTimedMetadata(
    item: MusicKit.MediaItem | MusicKit.TimedMetadata
): item is MusicKit.TimedMetadata {
    return 'blob' in item && 'storefrontAdamIds' in item;
}
