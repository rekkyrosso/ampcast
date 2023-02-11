import type {Observable} from 'rxjs';
import {Subscription} from 'rxjs';
import {mergeMap} from 'rxjs/operators';
import {SetOptional, SetRequired, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';
import DualPager from 'services/pagers/DualPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import pinStore from 'services/pins/pinStore';
import {bestOf, getTextFromHtml, Logger, ParentOf} from 'utils';
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
    private readonly pager: SequentialPager<T>;
    private nextPageUrl: string | undefined = undefined;
    private subscriptions?: Subscription;

    private static defaultToPage(response: any): MusicKitPage {
        const result = response.data[0]?.relationships?.tracks || response;
        const items = result.data || [];
        const nextPageUrl = result.next;
        const total = result.meta?.total;
        return {items, total, nextPageUrl};
    }

    constructor(
        href: string,
        params?: MusicKit.QueryParameters,
        private readonly options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>,
        toPage = MusicKitPager.defaultToPage
    ) {
        this.pager = new SequentialPager<T>(async (limit?: number): Promise<Page<T>> => {
            const response = await this.fetchNext(
                this.nextPageUrl || href,
                limit ? (params ? {...params, limit} : {limit}) : params
            );
            const result = toPage(response.data);
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
                this.subscriptions.add(
                    this.pager
                        .observeAdditions()
                        .pipe(mergeMap((items) => this.addRatings(items)))
                        .subscribe(logger)
                );

                this.subscriptions.add(
                    this.pager
                        .observeAdditions()
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

    private createItem(item: MusicKitItem): SetRequired<T, 'apple'> {
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
                return this.createMediaItem(item) as SetRequired<T, 'apple'>;
        }
    }

    private createMediaPlaylist(
        playlist: AppleMusicApi.Playlist | LibraryPlaylist
    ): SetRequired<MediaPlaylist, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Playlist['attributes']>(playlist);
        const description = item.description?.standard || item.description?.short;
        const src = `apple:${playlist.type}:${playlist.id}`;

        const mediaPlaylist: Writable<SetOptional<SetRequired<MediaPlaylist, 'apple'>, 'pager'>> = {
            src,
            itemType: ItemType.Playlist,
            externalUrl: item.url || undefined,
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item),
            owner: item.curatorName ? {name: item.curatorName} : undefined,
            modifiedAt: Math.floor(new Date(item.lastModifiedDate).valueOf() / 1000) || undefined,
            unplayable: !item.playParams || undefined,
            isPinned: pinStore.isPinned(src),
            inLibrary: playlist.type.startsWith('library-') || undefined,
            apple: {
                catalogId: this.getCatalogId(playlist),
            },
        };
        mediaPlaylist.pager = new MusicKitPager(
            `${playlist.href!}/tracks`,
            undefined,
            undefined,
            mediaPlaylist as MediaPlaylist
        );
        return mediaPlaylist as SetRequired<MediaPlaylist, 'apple'>;
    }

    private createMediaArtist(
        artist: AppleMusicApi.Artist | LibraryArtist
    ): SetRequired<MediaArtist, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Artist['attributes']>(artist);
        const description = item.editorialNotes?.standard || item.editorialNotes?.short;

        return {
            itemType: ItemType.Artist,
            src: `apple:${artist.type}:${artist.id}`,
            externalUrl: item.url || undefined,
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item as any),
            genres: this.getGenres(item),
            pager: this.createArtistAlbumsPager(artist),
            apple: {
                catalogId: this.getCatalogId(artist),
            },
        };
    }

    private createArtistTopTracks(
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
            apple: {
                catalogId: '',
            },
        };
    }

    private createMediaAlbum(
        album: AppleMusicApi.Album | LibraryAlbum
    ): SetRequired<MediaAlbum, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Album['attributes']>(album);
        const description = item.editorialNotes?.standard || item.editorialNotes?.short;

        const mediaAlbum: Writable<SetOptional<SetRequired<MediaAlbum, 'apple'>, 'pager'>> = {
            itemType: ItemType.Album,
            src: `apple:${album.type}:${album.id}`,
            externalUrl: item.url || undefined,
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item),
            artist: item.artistName,
            trackCount: item.trackCount,
            genres: this.getGenres(item),
            year: new Date(item.releaseDate).getFullYear() || 0,
            unplayable: !item.playParams || undefined,
            inLibrary: album.type.startsWith('library-') || undefined,
            apple: {
                catalogId: this.getCatalogId(album),
            },
        };
        mediaAlbum.pager = new MusicKitPager(
            `${album.href!}/tracks`,
            undefined,
            undefined,
            mediaAlbum as MediaAlbum
        );
        return mediaAlbum as SetRequired<MediaAlbum, 'apple'>;
    }

    private createMediaItem(
        song: AppleMusicApi.Song | LibrarySong | MusicVideo | LibraryMusicVideo
    ): SetRequired<MediaItem, 'apple'> {
        const item = this.createFromLibrary<AppleMusicApi.Song['attributes']>(song);
        const {id, kind} = item.playParams || {
            id: song.id,
            kind: song.type === 'music-videos' ? 'musicVideo' : 'song',
        };
        const description = item.editorialNotes?.standard || item.editorialNotes?.short;
        const isLibraryItem = song.type.startsWith('library-');
        const isPlaylistItem = this.parent?.itemType === ItemType.Playlist;
        const catalogId = this.getCatalogId(song);
        let externalUrl = item.url || undefined;
        if (
            !externalUrl &&
            catalogId &&
            this.parent?.itemType === ItemType.Album &&
            this.parent.externalUrl
        ) {
            externalUrl = `${this.parent.externalUrl}?i=${catalogId}`;
        }

        return {
            itemType: ItemType.Media,
            mediaType: kind === 'musicVideo' ? MediaType.Video : MediaType.Audio,
            src: `apple:${song.type}:${id}`,
            externalUrl,
            title: item.name,
            description: description ? getTextFromHtml(description) : undefined,
            thumbnails: this.createThumbnails(item),
            artists: [item.artistName],
            albumArtist: this.parent?.itemType === ItemType.Album ? this.parent.artist : undefined,
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
        };
    }

    private getCatalogId(item: any): string {
        if (item.type.startsWith('library-')) {
            let catalogId =
                item.attributes?.playParams?.[
                    item.type === 'library-playlists' ? 'globalId' : 'catalogId'
                ];
            if (!catalogId) {
                catalogId = this.getCatalog(item)?.id || '';
            }
            if (!catalogId) {
                logger.warn('No `catalogId` found for item:', item);
            }
            return catalogId || '';
        } else {
            return item.id;
        }
    }

    private createFromLibrary<T>(item: any): NonNullable<T> {
        return bestOf(item.attributes, this.getCatalog(item)?.attributes);
    }

    private getCatalog<T extends MusicKitItem>(item: any): T {
        return item.relationships?.catalog?.data?.[0];
    }

    private createThumbnails({
        artwork,
    }: {
        artwork?: AppleMusicApi.Artwork | undefined;
    }): Thumbnail[] | undefined {
        return artwork
            ? [
                  this.createThumbnail(artwork, 120),
                  this.createThumbnail(artwork, 240),
                  this.createThumbnail(artwork, 360),
                  this.createThumbnail(artwork, 480),
              ]
            : undefined;
    }

    private createThumbnail(
        artwork: MusicKit.Artwork | AppleMusicApi.Artwork,
        size: number
    ): Thumbnail {
        return {
            url: MusicKit.formatArtworkURL(artwork as MusicKit.Artwork, size, size),
            width: size,
            height: size,
        };
    }

    private createArtistAlbumsPager(
        artist: AppleMusicApi.Artist | LibraryArtist
    ): Pager<MediaAlbum> {
        const albumsPager = new MusicKitPager<MediaAlbum>(`${artist.href!}/albums`);
        if (artist.type.startsWith('library-')) {
            return albumsPager;
        }
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimpleMediaPager(() => [topTracks]);
        topTracksPager.fetchAt(0);
        return new DualPager(topTracksPager, albumsPager);
    }

    private createTopTracksPager(artist: AppleMusicApi.Artist | LibraryArtist): Pager<MediaItem> {
        return new MusicKitPager(
            artist.href!,
            {
                'limit[artists:top-songs]': '20',
                views: 'top-songs',
            },
            {maxSize: 20},
            undefined,
            (response: any) => {
                const result = response.data[0]?.views?.['top-songs'] || response;
                const items = result.data || [];
                const nextPageUrl = result.next;
                const total = result.meta?.total;
                return {items, total, nextPageUrl};
            }
        );
    }

    private getGenres({genreNames = []}: {genreNames: string[]}): readonly string[] | undefined {
        return genreNames.filter((name) => name !== 'Music');
    }

    private async addRatings(items: readonly T[]): Promise<void> {
        const item = items[0];
        if (!item || !apple.canRate(item, true)) {
            return;
        }

        const ids: string[] = items
            .filter((item) => item.rating === undefined)
            .map((item) => {
                const [, , id] = item.src.split(':');
                return id;
            });

        if (ids.length === 0) {
            return;
        }

        const [, type] = item.src.split(':');
        const musicKit = MusicKit.getInstance();
        const {
            data: {data},
        } = await musicKit.api.music(`/v1/me/ratings/${type}`, {ids});

        if (!data) {
            return;
        }

        const ratings = new Map<string, number>(
            data.map((data: any) => [data.id, data.attributes.value])
        );

        mediaObjectChanges.dispatch(
            ids.map((id) => ({
                match: (object: MediaObject) => object.src === `apple:${type}:${id}`,
                values: {rating: ratings.get(id) || 0},
            }))
        );
    }

    private async addInLibrary(items: readonly T[]): Promise<void> {
        const item = items[0];
        if (!item || !apple.canStore(item, true)) {
            return;
        }

        const isAlbumTrack = this.parent?.itemType === ItemType.Album;
        const ids: string[] = items
            .filter(
                (item) =>
                    item.inLibrary === undefined &&
                    !(isAlbumTrack && item.src.startsWith('apple:library-'))
            )
            .map((item) => item.apple?.catalogId)
            .filter((catalogId) => !!catalogId) as string[];

        if (ids.length === 0) {
            return;
        }

        let [, type] = item.src.split(':');
        type = type.replace('library-', '');
        const musicKit = MusicKit.getInstance();
        const {
            data: {resources},
        } = await musicKit.api.music(`/v1/catalog/{{storefrontId}}`, {
            [`fields[${type}]`]: 'inLibrary',
            'format[resources]': 'map',
            [`ids[${type}]`]: ids,
            'omit[resource]': 'autos',
        });
        const data = resources[type];

        if (!data) {
            return;
        }

        const inLibrary = new Map<string, boolean>(
            Object.keys(data).map((key) => [key, data[key].attributes.inLibrary])
        );

        mediaObjectChanges.dispatch<MediaObject>(
            ids.map((id) => ({
                match: (object: MediaObject) => object.apple?.catalogId === id,
                values: {inLibrary: inLibrary.get(id) || false},
            }))
        );
    }
}
