import type {Observable} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import DualPager from 'services/pagers/DualPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';

type LibrarySong = Omit<AppleMusicApi.Song, 'type'> & {type: 'library-songs'};
type LibraryMusicVideo = Omit<AppleMusicApi.Song, 'type'> & {type: 'music-videos'};
type LibraryArtist = Omit<AppleMusicApi.Artist, 'type'> & {type: 'library-artists'};
type LibraryAlbum = Omit<AppleMusicApi.Album, 'type'> & {type: 'library-albums'};
type LibraryPlaylist = Omit<AppleMusicApi.Playlist, 'type'> & {type: 'library-playlists'};
type MusicKitItem =
    | AppleMusicApi.Song
    | LibrarySong
    | LibraryMusicVideo
    | AppleMusicApi.Artist
    | LibraryArtist
    | AppleMusicApi.Album
    | LibraryAlbum
    | AppleMusicApi.Playlist
    | LibraryPlaylist;

export interface MusicKitPage extends Page<MusicKitItem> {
    readonly nextPageUrl?: string | undefined;
}

export default class MusicKitPager<T extends MediaObject> implements Pager<T> {
    private readonly pager: Pager<T>;
    private nextPageUrl: string | undefined = undefined;

    constructor(
        href: string,
        map: (response: any) => MusicKitPage,
        params?: Record<string, string>,
        options?: Partial<PagerConfig>,
        private readonly album?: AppleMusicApi.Album['attributes']
    ) {
        this.pager = new SequentialPager<T>(async (limit?: number): Promise<Page<T>> => {
            const response = await this.fetchNext(
                this.nextPageUrl || href,
                limit ? (params ? {...params, limit} : {limit}) : params
            );
            const result = map(response.data);
            const items = this.createItems(result.items);
            const total = result.total;
            const atEnd = !result.nextPageUrl;
            this.nextPageUrl = result.nextPageUrl;
            return {items, total, atEnd};
        }, options);
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
    }

    fetchAt(index: number, length: number): void {
        this.pager.fetchAt(index, length);
    }

    private async fetchNext(href: string, params?: Record<string, string | number>): Promise<any> {
        const musicKit = MusicKit.getInstance();
        if (params) {
            href = `${href}${href.includes('?') ? '&' : '?'}${new URLSearchParams(params as any)}`;
        }
        return musicKit.api.music(href);
    }

    private createItems(items: readonly MusicKitItem[]): T[] {
        return items.map((item) => this.createItem(item) as T);
    }

    private createItem(item: MusicKitItem): T {
        switch (item.type) {
            case 'playlists':
            case 'library-playlists':
                return this.createMediaPlaylist(item) as T;

            case 'artists':
            case 'library-artists':
                return this.createMediaArtist(item) as T;

            case 'albums':
            case 'library-albums':
                return this.createMediaAlbum(item) as T;

            case 'songs':
            case 'library-songs':
            case 'music-videos':
                return this.createMediaItem(item) as T;
        }
    }

    private createMediaPlaylist(playlist: AppleMusicApi.Playlist | LibraryPlaylist): MediaPlaylist {
        const item = this.createFromLibrary<AppleMusicApi.Playlist['attributes']>(playlist);
        const {id, kind} = item.playParams || {id: playlist.id, kind: 'playlist'};
        const isLibrary = playlist.href?.startsWith('/v1/me/library/');

        return {
            itemType: ItemType.Playlist,
            src: `apple:${kind}:${id}`,
            externalUrl:
                item.url || (isLibrary ? `https://music.apple.com/library/playlist/${id}` : ''),
            title: item.name,
            thumbnails: this.createThumbnails(playlist),
            owner: {
                name: item.curatorName || '',
                url: '',
            },
            pager: this.createPager(`${playlist.href}`, {
                include: 'tracks,catalog',
                'fields[library-playlists]': 'playParams,name,artwork,url,tracks',
            }),
            unplayable: !item.playParams,
        };
    }

    private createMediaArtist(artist: AppleMusicApi.Artist | LibraryArtist): MediaArtist {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

        return {
            itemType: ItemType.Artist,
            src: `apple:artist:${artist.id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(artist),
            genre: this.getGenre(item),
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createArtistTopTracks(artist: AppleMusicApi.Artist | LibraryArtist): MediaAlbum {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);
        return {
            itemType: ItemType.Album,
            src: `apple:top-tracks:${artist.id}`,
            title: 'Top Tracks',
            thumbnails: this.createThumbnails(artist),
            artist: item.name,
            genre: this.getGenre(item),
            pager: this.createTopTracksPager(artist),
        };
    }

    private createMediaAlbum(album: AppleMusicApi.Album | LibraryAlbum): MediaAlbum {
        const item = this.createFromLibrary<AppleMusicApi.Album['attributes']>(album);
        const {id, kind} = item.playParams || {id: album.id, kind: 'album'};

        return {
            itemType: ItemType.Album,
            src: `apple:${kind}:${id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(album),
            artist: item.artistName,
            trackCount: item.trackCount,
            genre: this.getGenre(item),
            year: new Date(item.releaseDate).getFullYear() || 0,
            pager: this.createPager(
                album.href!,
                {
                    'include[library-songs]': 'catalog',
                    'fields[library-songs]': 'playParams,name,artistName,albumName,artwork',
                },
                undefined,
                item
            ),
            unplayable: !item.playParams,
        };
    }

    private createMediaItem(song: AppleMusicApi.Song | LibrarySong | LibraryMusicVideo): MediaItem {
        const item = this.createFromLibrary<AppleMusicApi.Song['attributes']>(song);
        const {id, kind} = item.playParams || {
            id: song.id,
            kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
        };

        return {
            itemType: ItemType.Media,
            mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
            src: `apple:${kind}:${id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(song),
            artist: item.artistName,
            albumArtist: this.album ? this.album.artistName : undefined,
            album: item.albumName,
            duration: item.durationInMillis / 1000,
            genre: this.getGenre(item),
            disc: item.discNumber,
            track: item.trackNumber,
            year: new Date(item.releaseDate).getFullYear() || undefined,
            isrc: item.isrc,
            unplayable: !item.playParams,
            playedAt: 0,
        };
    }

    private createFromLibrary<T>(item: any): NonNullable<T> {
        const catalog = item.relationships?.catalog?.data?.[0];
        return {...catalog?.attributes, ...item.attributes};
    }

    private createThumbnails(item: MusicKitItem): Thumbnail[] | undefined {
        const artwork: MusicKit.Artwork | undefined = (item.attributes as any)
            ?.artwork as unknown as MusicKit.Artwork;

        return artwork
            ? [
                  this.createThumbnail(artwork, 60),
                  this.createThumbnail(artwork, 120),
                  this.createThumbnail(artwork, 240),
                  this.createThumbnail(artwork, 480),
              ]
            : undefined;
    }

    private createThumbnail(artwork: MusicKit.Artwork, size: number): Thumbnail {
        return {
            url: MusicKit.formatArtworkURL(artwork, size, size),
            width: size,
            height: size,
        };
    }

    private createArtistAlbumsPager(
        artist: AppleMusicApi.Artist | LibraryArtist
    ): Pager<MediaAlbum> {
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimplePager([topTracks]);
        const albumsPager = this.createPager<MediaAlbum>(
            artist.relationships?.albums.href ||
                `/v1/catalog/{{storefrontId}}/artists/${artist.id}/albums`
        );
        return new DualPager(topTracksPager, albumsPager);
    }

    private createTopTracksPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
        return new MusicKitPager(
            artist.href!,
            (response: any) => {
                const result = response.data[0]?.views?.['top-songs'] || response;
                const items = result.data || [];
                const nextPageUrl = result.next;
                const total = result.meta?.total;
                return {items, total, nextPageUrl};
            },
            {
                'limit[artists:top-songs]': '20',
                views: 'top-songs',
            },
            {maxSize: 20}
        );
    }

    private createPager<T extends MediaObject>(
        href: string,
        params?: Record<string, string>,
        options?: Partial<PagerConfig>,
        album?: AppleMusicApi.Album['attributes']
    ): Pager<T> {
        return new MusicKitPager(
            href,
            (response: any) => {
                const result = response.data[0]?.relationships?.tracks || response;
                const items = result.data || [];
                const nextPageUrl = result.next;
                const total = result.meta?.total;
                return {items, total, nextPageUrl};
            },
            params,
            options,
            album
        );
    }

    private getGenre({genreNames = []}: {genreNames: string[]}): string | undefined {
        return genreNames.filter((name) => name !== 'Music').join(';') || undefined;
    }
}
