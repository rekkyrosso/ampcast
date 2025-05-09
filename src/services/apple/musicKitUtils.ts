import {SetOptional, SetRequired, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import PlaybackType from 'types/PlaybackType';
import RadioStation from 'types/RadioStation';
import Thumbnail from 'types/Thumbnail';
import {getTextFromHtml, Logger} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {bestOf} from 'services/metadata';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import pinStore from 'services/pins/pinStore';
import MusicKitPager from './MusicKitPager';

const logger = new Logger('MusicKitUtils');

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

export interface MusicKitPage extends Page<MusicKitItem> {
    readonly nextPageUrl?: string | undefined;
}

const musicKitUtils = {
    createItems<T extends MediaObject>(items: readonly MusicKitItem[], parent?: ParentOf<T>): T[] {
        return items.map((item) => this.createItem(item, parent) as T);
    },

    createItem<T extends MediaObject>(
        item: MusicKitItem,
        parent?: ParentOf<T>
    ): SetRequired<T, 'apple'> {
        switch (item.type) {
            case 'playlists':
            case 'library-playlists':
                return this.createMediaPlaylist(item) as SetRequired<T, 'apple'>;

            case 'artists':
            case 'library-artists':
                return this.createMediaArtist(item) as SetRequired<T, 'apple'>;

            case 'albums':
            case 'library-albums':
                return this.createMediaAlbum(item) as SetRequired<T, 'apple'>;

            case 'songs':
            case 'library-songs':
            case 'music-videos':
            case 'library-music-videos':
                return this.createMediaItem(item, parent as ParentOf<MediaItem>) as SetRequired<
                    T,
                    'apple'
                >;

            case 'stations':
                return this.createRadioItem(item) as SetRequired<T, 'apple'>;
        }
    },

    createMediaPlaylist(
        playlist: AppleMusicApi.Playlist | LibraryPlaylist
    ): SetRequired<MediaPlaylist, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Playlist['attributes']>(playlist);
        const description = item.description?.standard || item.description?.short;
        const src = `apple:${playlist.type}:${playlist.id}`;
        const catalogId = this.getCatalogId(playlist);

        const mediaPlaylist: Writable<SetOptional<SetRequired<MediaPlaylist, 'apple'>, 'pager'>> = {
            src,
            itemType: ItemType.Playlist,
            externalUrl: this.getExternalUrl(playlist),
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item),
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
    },

    createMediaArtist(
        artist: AppleMusicApi.Artist | LibraryArtist
    ): SetRequired<MediaArtist, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);
        const description = item.editorialNotes?.standard || item.editorialNotes?.short;
        const catalogId = this.getCatalogId(artist);

        return {
            itemType: ItemType.Artist,
            src: `apple:${artist.type}:${artist.id}`,
            externalUrl: this.getExternalUrl(artist),
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item as any),
            genres: this.getGenres(item),
            pager: this.createArtistAlbumsPager(artist),
            apple: {catalogId},
        };
    },

    createMediaAlbum(album: AppleMusicApi.Album | LibraryAlbum): SetRequired<MediaAlbum, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Album['attributes']>(album);
        const src = `apple:${album.type}:${album.id}`;
        const description = item.editorialNotes?.standard || item.editorialNotes?.short;
        const catalogId = this.getCatalogId(album);

        const mediaAlbum: Writable<SetOptional<SetRequired<MediaAlbum, 'apple'>, 'pager'>> = {
            itemType: ItemType.Album,
            src,
            externalUrl: this.getExternalUrl(album),
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item),
            artist: item.artistName,
            trackCount: item.trackCount,
            genres: this.getGenres(item),
            year: new Date(item.releaseDate).getFullYear() || 0,
            unplayable: !item.playParams || undefined,
            inLibrary: album.type.startsWith('library-') || undefined,
            copyright: item?.copyright,
            explicit: item?.contentRating === 'explicit',
            shareLink: item.url || undefined,
            apple: {catalogId},
        };
        mediaAlbum.pager = new MusicKitPager(
            `${album.href!}/tracks`,
            {'include[library-songs]': 'catalog'},
            {pageSize: 100},
            mediaAlbum as MediaAlbum
        );
        return mediaAlbum as SetRequired<MediaAlbum, 'apple'>;
    },

    createMediaItem(
        song: AppleMusicApi.Song | LibrarySong | MusicVideo | LibraryMusicVideo,
        parent?: ParentOf<MediaItem>
    ): SetRequired<MediaItem, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Song['attributes']>(song);
        const {id, kind} = item.playParams || {
            id: song.id,
            kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
        };
        const src = `apple:${song.type}:${id}`;
        const description = item.editorialNotes?.standard || item.editorialNotes?.short;
        const isLibraryItem = song.type.startsWith('library-');
        const isPlaylistItem = parent?.itemType === ItemType.Playlist;
        const catalogId = this.getCatalogId(song);
        let externalUrl = item.url || undefined;
        if (!externalUrl && catalogId && parent?.itemType === ItemType.Album && parent.shareLink) {
            externalUrl = `${parent.shareLink}?i=${catalogId}`;
        }

        const mediaItem: Writable<SetRequired<MediaItem, 'apple'>> = {
            itemType: ItemType.Media,
            mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
            playbackType: PlaybackType.HLS,
            src,
            externalUrl,
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item),
            artists: [item.artistName],
            albumArtist: parent?.itemType === ItemType.Album ? parent.artist : undefined,
            album: item.albumName,
            duration: item.durationInMillis / 1000,
            genres: this.getGenres(item),
            disc: item.discNumber,
            track: item.trackNumber,
            year: new Date(item.releaseDate).getFullYear() || undefined,
            isrc: item.isrc,
            unplayable: !item.playParams || undefined,
            playedAt: 0,
            inLibrary: (isLibraryItem && !isPlaylistItem) || undefined,
            apple: {catalogId},
            explicit: item?.contentRating === 'explicit',
            shareLink: item.url || undefined,
        };
        return mediaItem;
    },

    createFromTimedMetadata(data: MusicKit.TimedMetadata, station: RadioStation): MediaItem {
        const {storefrontAdamIds} = data;
        const catalogId = storefrontAdamIds[Object.keys(storefrontAdamIds)[0]] || '';
        const type = catalogId ? 'songs' : data.album ? 'track' : 'shows';
        const artist = data.performer || '';
        const id = catalogId || `${artist}-${data.title}`;
        const thumbnails = data?.links.map(({description, url}, index) => {
            const size = parseInt(description, 10) || 400 * index;
            return {url, width: size, height: size};
        });
        return {
            src: `apple:${type}:${id}`,
            linearType: type === 'shows' ? LinearType.Programme : LinearType.MusicTrack,
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            playbackType: PlaybackType.HLS,
            title: data.title,
            thumbnails: thumbnails || station.thumbnails,
            artists: artist ? [artist] : undefined,
            album: data.album,
            stationName: station.title,
            duration: 0,
            playedAt: 0,
            noScrobble: type === 'shows' || undefined,
            unplayable: !catalogId || undefined,
            apple: {catalogId},
        };
    },

    createRadioItem(station: Station): SetRequired<MediaItem, 'apple'> {
        const attributes = station.attributes;
        const description = attributes.editorialNotes?.standard || attributes.editorialNotes?.short;
        const catalogId = this.getCatalogId(station);

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
            thumbnails: this.createThumbnails(attributes),
            noScrobble: true,
            duration: MAX_DURATION,
            playedAt: 0,
            apple: {catalogId},
        };
        return mediaItem;
    },

    createFromLibrary<T>(item: any): NonNullable<T> {
        return bestOf(item.attributes, this.getCatalog(item)?.attributes);
    },

    createThumbnails({
        artwork,
    }: {
        artwork?: AppleMusicApi.Artwork | undefined;
    } = {}): Thumbnail[] | undefined {
        return artwork
            ? [
                  this.createThumbnail(artwork, 240),
                  this.createThumbnail(artwork, 360),
                  this.createThumbnail(artwork, 480),
                  this.createThumbnail(artwork, 800),
              ]
            : undefined;
    },

    createThumbnail(artwork: MusicKit.Artwork | AppleMusicApi.Artwork, size: number): Thumbnail {
        return {
            url: MusicKit.formatArtworkURL(artwork as MusicKit.Artwork, size, size),
            width: size,
            height: size,
        };
    },

    createArtistAlbumsPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaAlbum> {
        const albumsPager = new MusicKitPager<MediaAlbum>(`${artist.href!}/albums`);
        if (artist.type.startsWith('library-')) {
            return albumsPager;
        }
        const topTracks = this.createArtistTopTracks(artist);
        const videos = this.createArtistVideos(artist);
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
    },

    createArtistTopTracks(
        artist: AppleMusicApi.Artist | LibraryArtist
    ): SetRequired<MediaAlbum, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

        return {
            itemType: ItemType.Album,
            src: `apple:top-tracks:${artist.id}`,
            title: 'Top Tracks',
            thumbnails: this.createThumbnails(item as any),
            artist: item.name,
            genres: this.getGenres(item),
            pager: this.createTopTracksPager(artist),
            synthetic: true,
            inLibrary: false,
            trackCount: undefined,
            apple: {catalogId: ''},
        };
    },

    createArtistVideos(artist: AppleMusicApi.Artist | LibraryArtist): MediaAlbum {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

        return {
            itemType: ItemType.Album,
            src: `apple:videos:${artist.id}`,
            title: 'Music Videos',
            thumbnails: this.createThumbnails(item as any),
            artist: item.name,
            genres: this.getGenres(item),
            pager: this.createVideosPager(artist),
            synthetic: true,
            inLibrary: false,
            trackCount: undefined,
            apple: {catalogId: ''},
        };
    },

    createTopTracksPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
        return this.createArtistViewPager(artist, 'top-songs');
    },

    createVideosPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
        return this.createArtistViewPager(artist, 'top-music-videos');
    },

    createArtistViewPager(
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
    },

    getCatalog<T extends MusicKitItem>(item: any): T {
        return item.relationships?.catalog?.data?.[0];
    },

    getCatalogId(item: any): string {
        if (item.type.startsWith('library-')) {
            let catalogId =
                item.attributes?.playParams?.[
                    item.type === 'library-playlists' ? 'globalId' : 'catalogId'
                ];
            if (!catalogId) {
                catalogId = this.getCatalog(item)?.id;
            }
            return catalogId || '';
        } else {
            return item.id;
        }
    },

    getExternalUrl(item: any): string {
        const musicKit = MusicKit.getInstance();
        const isLibraryItem = item.type.startsWith('library-');
        const type = item.type.replace('library-', '').replace('playlists', 'playlist');
        return isLibraryItem
            ? `https://music.apple.com/${musicKit.storefrontId}/library/${type}/${item.id}`
            : item.attributes?.url;
    },

    getGenres({genreNames = []}: {genreNames: string[]}): readonly string[] | undefined {
        return genreNames.filter((name) => name !== 'Music');
    },
};

export default musicKitUtils;
