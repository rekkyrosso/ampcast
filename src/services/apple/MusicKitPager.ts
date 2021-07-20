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
import SequentialPager from 'services/SequentialPager';
import {createEmptyMediaObject} from 'utils';

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

interface MusicKitPage extends Page<MusicKitItem> {
    readonly nextPageUrl?: string | undefined;
}

export default class MusicKitPager<T extends MediaObject> implements Pager<T> {
    private readonly pager: Pager<T>;
    private nextPageUrl: string | undefined = undefined;

    constructor(
        href: string,
        map: (response: any) => MusicKitPage,
        options?: Partial<PagerConfig>
    ) {
        this.pager = new SequentialPager<T>(async (limit?: number): Promise<Page<T>> => {
            const response = await this.fetchNext(this.nextPageUrl || href, limit);
            const result = map(response.data);
            const items = this.createItems(result.items);
            const total = result.total;
            const atEnd = !result.nextPageUrl;
            this.nextPageUrl = result.nextPageUrl;
            return {items, total, atEnd};
        }, options);
    }

    observeComplete(): Observable<readonly T[]> {
        return this.pager.observeComplete();
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeMaxSize(): Observable<number> {
        return this.pager.observeMaxSize();
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

    private async fetchNext(href: string, limit?: number): Promise<any> {
        const musicKit = MusicKit.getInstance();
        if (limit && !/[?&]limit=/.test(href)) {
            href = `${href}${href.includes('?') ? '&' : '?'}limit=${limit}`;
        }
        return (musicKit.api as any).music(href);
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
        const item = playlist.attributes!;
        const {id, kind} = item.playParams || {id: playlist.id, kind: 'playlist'};

        return {
            ...createEmptyMediaObject(ItemType.Playlist),
            src: `apple:${kind}:${id}` + (item.playParams ? '' : ':unplayable'),
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(playlist),
            apple: {
                href: playlist.href,
            },
            owner: {
                name: item.curatorName || '',
                url: '',
            },
            pager: this.createPager(`${playlist.href}?include=tracks`),
            unplayable: !item.playParams,
        };
    }

    private createMediaArtist(artist: AppleMusicApi.Artist | LibraryArtist): MediaArtist {
        const item = artist.attributes!;

        return {
            ...createEmptyMediaObject(ItemType.Artist),
            src: `apple:artist:${artist.id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(artist),
            genre: item.genreNames.join(';'),
            apple: {
                href: artist.href,
            },
            pager: this.createPager(
                artist.relationships?.albums.href ||
                    `/v1/catalog/{{storefrontId}}/artists/${artist.id}/albums`
            ),
        };
    }

    private createMediaAlbum(album: AppleMusicApi.Album | LibraryAlbum): MediaAlbum {
        const item = album.attributes!;
        const {id, kind} = item.playParams || {id: album.id, kind: 'album'};

        return {
            ...createEmptyMediaObject(ItemType.Album),
            src: `apple:${kind}:${id}` + (item.playParams ? '' : ':unplayable'),
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(album),
            artist: item.artistName,
            trackCount: item.trackCount,
            genre: item.genreNames.join(';'),
            year: new Date(item.releaseDate).getFullYear() || 0,
            pager: this.createPager(album.href!),
            apple: {
                href: album.href,
            },
            unplayable: !item.playParams,
        };
    }

    private createMediaItem(song: AppleMusicApi.Song | LibrarySong | LibraryMusicVideo): MediaItem {
        const item = song.attributes!;
        const {id, kind} = item.playParams || {
            id: song.id,
            kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
        };

        return {
            ...createEmptyMediaObject(ItemType.Media),
            mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
            src: `apple:${kind}:${id}` + (item.playParams ? '' : ':unplayable'),
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(song),
            artist: item.artistName,
            albumArtist: item.albumName ? item.artistName : undefined,
            album: item.albumName,
            duration: item.durationInMillis / 1000,
            genre: item.genreNames.join(';'),
            disc: item.discNumber,
            track: item.trackNumber,
            year: new Date(item.releaseDate).getFullYear() || undefined,
            apple: {
                href: song.href,
            },
            unplayable: !item.playParams,
        };
    }

    private createThumbnails(item: MusicKitItem): Thumbnail[] {
        const artwork: MusicKit.Artwork | undefined = (item.attributes as any)
            ?.artwork as unknown as MusicKit.Artwork;

        return artwork
            ? [
                  this.createThumbnail(artwork, 60),
                  this.createThumbnail(artwork, 120),
                  this.createThumbnail(artwork, 240),
                  this.createThumbnail(artwork, 480),
              ]
            : [];
    }

    private createThumbnail(artwork: MusicKit.Artwork, size: number): Thumbnail {
        return {
            url: MusicKit.formatArtworkURL(artwork, size, size),
            width: size,
            height: size,
        };
    }

    private createPager<T extends MediaObject>(
        href: string,
        options?: Partial<PagerConfig>
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
            options
        );
    }
}
