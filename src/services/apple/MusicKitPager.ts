import type {Observable} from 'rxjs';
import {Subscription} from 'rxjs';
import {filter, map, mergeMap, pairwise, startWith} from 'rxjs/operators';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import {dispatchRatingChanges, dispatchLibraryChanges} from 'services/actions';
import DualPager from 'services/pagers/DualPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import pinStore from 'services/pins/pinStore';
import {getTextFromHtml, Logger} from 'utils';
import apple from './apple';

const logger = new Logger('MusicKitPager');

type LibrarySong = Omit<AppleMusicApi.Song, 'type'> & {type: 'library-songs'};
type MusicVideo = Omit<AppleMusicApi.Song, 'type'> & {type: 'music-videos'};
type LibraryMusicVideo = Omit<AppleMusicApi.Song, 'type'> & {type: 'library-music-videos'};
type LibraryArtist = Omit<AppleMusicApi.Artist, 'type'> & {type: 'library-artists'};
type LibraryAlbum = Omit<AppleMusicApi.Album, 'type'> & {type: 'library-albums'};
type LibraryPlaylist = Omit<AppleMusicApi.Playlist, 'type'> & {type: 'library-playlists'};
type MusicKitItem =
    | AppleMusicApi.Song
    | LibrarySong
    | MusicVideo
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
    private subscriptions?: Subscription;

    static create<T extends MediaObject>(
        href: string,
        params?: MusicKit.QueryParameters,
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

    constructor(
        href: string,
        map: (response: any) => MusicKitPage,
        params?: MusicKit.QueryParameters,
        private readonly options?: Partial<PagerConfig>,
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
        this.subscriptions?.unsubscribe();
    }

    fetchAt(index: number, length: number): void {
        if (!this.subscriptions) {
            this.connect();
        }

        this.pager.fetchAt(index, length);
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            if (!this.options?.lookup) {
                this.subscriptions!.add(
                    this.observeAdditions()
                        .pipe(mergeMap((items) => this.addRatings(items)))
                        .subscribe(logger)
                );

                this.subscriptions!.add(
                    this.observeAdditions()
                        .pipe(mergeMap((items) => this.addInLibrary(items)))
                        .subscribe(logger)
                );
            }
        }
    }

    private async fetchNext(href: string, params?: MusicKit.QueryParameters): Promise<any> {
        return MusicKit.getInstance().api.music(href, params);
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
            case 'library-music-videos':
                return this.createMediaItem(item) as T;
        }
    }

    private createMediaPlaylist(playlist: AppleMusicApi.Playlist | LibraryPlaylist): MediaPlaylist {
        const item = this.createFromLibrary<AppleMusicApi.Playlist['attributes']>(playlist);
        const description = item.description?.standard || item.description?.short;
        const src = `apple:${playlist.type}:${playlist.id}`;
        const inLibrary = playlist.type.startsWith('library-') || undefined;

        return {
            src,
            itemType: ItemType.Playlist,
            externalUrl:
                item.url ||
                (inLibrary ? `https://music.apple.com/library/playlist/${playlist.id}` : ''),
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(playlist),
            owner: {
                name: item.curatorName || '',
                url: '',
            },
            modifiedAt: Math.floor(new Date(item.lastModifiedDate).valueOf() / 1000) || undefined,
            pager: MusicKitPager.create(`${playlist.href}`, {
                include: 'tracks,catalog',
                'fields[library-playlists]': 'playParams,name,artwork,url,tracks',
            }),
            unplayable: !item.playParams,
            isPinned: pinStore.isPinned(src),
            inLibrary,
        };
    }

    private createMediaArtist(artist: AppleMusicApi.Artist | LibraryArtist): MediaArtist {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

        return {
            itemType: ItemType.Artist,
            src: `apple:${artist.type}:${artist.id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(artist),
            genres: this.getGenres(item),
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createArtistTopTracks(artist: AppleMusicApi.Artist | LibraryArtist): MediaAlbum {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);

        return {
            itemType: ItemType.Album,
            src: `apple:top-tracks:${artist.id}`,
            externalUrl: '',
            title: 'Top Tracks',
            thumbnails: this.createThumbnails(artist),
            artist: item.name,
            genres: this.getGenres(item),
            pager: this.createTopTracksPager(artist),
            synthetic: true,
        };
    }

    private createMediaAlbum(album: AppleMusicApi.Album | LibraryAlbum): MediaAlbum {
        const item = this.createFromLibrary<AppleMusicApi.Album['attributes']>(album);

        return {
            itemType: ItemType.Album,
            src: `apple:${album.type}:${album.id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(album),
            artist: item.artistName,
            trackCount: item.trackCount,
            genres: this.getGenres(item),
            year: new Date(item.releaseDate).getFullYear() || 0,
            pager: MusicKitPager.create(
                album.href!,
                {
                    'include[library-songs]': 'catalog',
                    'fields[library-songs]': 'playParams,name,artistName,albumName,artwork',
                },
                undefined,
                item
            ),
            unplayable: !item.playParams,
            inLibrary: album.type.startsWith('library-') || undefined,
        };
    }

    private createMediaItem(
        song: AppleMusicApi.Song | LibrarySong | MusicVideo | LibraryMusicVideo
    ): MediaItem {
        const item = this.createFromLibrary<AppleMusicApi.Song['attributes']>(song);
        const {id, kind} = item.playParams || {
            id: song.id,
            kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
        };

        return {
            itemType: ItemType.Media,
            mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
            src: `apple:${song.type}:${id}`,
            externalUrl: item.url,
            title: item.name,
            thumbnails: this.createThumbnails(song),
            artists: [item.artistName],
            albumArtist: this.album ? this.album.artistName : undefined,
            album: item.albumName,
            duration: item.durationInMillis / 1000,
            genres: this.getGenres(item),
            // disc: item.discNumber,
            track: item.trackNumber,
            year: new Date(item.releaseDate).getFullYear() || undefined,
            isrc: item.isrc,
            unplayable: !item.playParams,
            playedAt: 0,
        };
    }

    private createFromLibrary<T>(item: any): NonNullable<T> {
        const catalog = this.getCatalog(item);
        return {...catalog?.attributes, ...item.attributes};
    }

    private getCatalog<T extends MusicKitItem>(item: any): T {
        return item.relationships?.catalog?.data?.[0];
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
        const topTracksPager = new SimpleMediaPager(() => [topTracks]);
        const albumsPager = MusicKitPager.create<MediaAlbum>(
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

    private getGenres({genreNames = []}: {genreNames: string[]}): readonly string[] | undefined {
        return genreNames.filter((name) => name !== 'Music');
    }

    private observeAdditions(): Observable<readonly T[]> {
        return this.observeItems().pipe(
            startWith([]),
            pairwise(),
            map(([oldItems, newItems]) =>
                newItems.filter(
                    (newItem) => !oldItems.find((oldItem) => oldItem.src === newItem.src)
                )
            ),
            filter((additions) => additions.length > 0)
        );
    }

    private async addRatings(items: readonly T[]): Promise<void> {
        const item = items[0];
        if (apple.canRate(item)) {
            const musicKit = MusicKit.getInstance();
            const [, type] = items[0].src.split(':');
            const ids = items.map((item) => {
                const [, , id] = item.src.split(':');
                return id;
            });
            const {
                data: {data},
            } = await musicKit.api.music(`/v1/me/ratings/${type}`, {ids});
            const ratings = new Map<string, number>(
                data.map((data: any) => [data.id, data.attributes.value])
            );

            dispatchRatingChanges(
                ids.map((id) => ({
                    src: `apple:${type}:${id}`,
                    rating: ratings.get(id) || 0,
                }))
            );
        }
    }

    private async addInLibrary(items: readonly T[]): Promise<void> {
        const item = items[0];
        if (item && item.inLibrary === undefined && apple.canStore(item)) {
            const [, type] = item.src.split(':');
            if (!type.startsWith('library-')) {
                const musicKit = MusicKit.getInstance();
                const ids = items.map((item) => {
                    const [, , id] = item.src.split(':');
                    return id;
                });
                const key = `ids[${type}]`;
                const fields = `fields[${type}]`;
                const {
                    data: {resources},
                } = await musicKit.api.music(`/v1/catalog/{{storefrontId}}`, {
                    [fields]: 'inLibrary',
                    'format[resources]': 'map',
                    [key]: ids,
                    'omit[resource]': 'autos',
                });
                const data = resources[type];
                if (data) {
                    const inLibrary = new Map<string, boolean>(
                        Object.keys(data).map((key) => [key, data[key].attributes.inLibrary])
                    );

                    dispatchLibraryChanges(
                        ids.map((id) => ({
                            src: `apple:${type}:${id}`,
                            inLibrary: inLibrary.get(id) || false,
                        }))
                    );
                }
            }
        }
    }
}
