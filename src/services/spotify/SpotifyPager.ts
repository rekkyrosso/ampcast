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
import {dispatchRatingChanges, RatingChange} from 'services/actions';
import DualPager from 'services/pagers/DualPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import pinStore from 'services/pins/pinStore';
import {getTextFromHtml, Logger} from 'utils';
import spotify, {
    SpotifyAlbum,
    spotifyApi,
    SpotifyArtist,
    SpotifyEpisode,
    SpotifyItem,
    SpotifyPlaylist,
    spotifySettings,
    SpotifyTrack,
} from './spotify';
import {refreshToken} from './spotifyAuth';

const logger = new Logger('SpotifyPager');

export interface SpotifyPage extends Page<SpotifyItem> {
    readonly next?: string | undefined;
}

export default class SpotifyPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 50;

    private readonly pager: Pager<T>;
    private readonly defaultConfig: PagerConfig = {
        minPageSize: SpotifyPager.minPageSize,
        maxPageSize: SpotifyPager.maxPageSize,
        pageSize: SpotifyPager.maxPageSize,
    };
    private readonly config: PagerConfig;
    private pageNumber = 1;
    private subscriptions?: Subscription;

    constructor(
        fetch: (offset: number, limit: number) => Promise<SpotifyPage>,
        options?: Partial<PagerConfig>
    ) {
        this.config = {...this.defaultConfig, ...options};

        this.pager = new SequentialPager<T>(
            async (limit = this.defaultConfig.pageSize!): Promise<Page<T>> => {
                const offset = (this.pageNumber - 1) * limit;
                const fetchPage = async () => {
                    const {items, total, next} = await fetch(offset, limit);
                    this.pageNumber++;
                    return {
                        items: items.map((item) => this.createMediaObject(item)),
                        total,
                        atEnd: !next,
                    };
                };
                try {
                    const page = await fetchPage();
                    return page;
                } catch (err: any) {
                    if (err.status === 401) {
                        await refreshToken();
                        const page = await fetchPage();
                        return page;
                    } else {
                        throw err;
                    }
                }
            },
            this.config
        );
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

            if (!this.config.lookup) {
                this.subscriptions!.add(
                    this.observeAdditions()
                        .pipe(mergeMap((items) => this.addRatings(items)))
                        .subscribe(logger)
                );
            }
        }
    }

    private createMediaObject(item: SpotifyItem): T {
        switch (item.type) {
            case 'episode':
                return this.createMediaItemFromEpisode(item) as T;

            case 'artist':
                return this.createMediaArtist(item) as T;

            case 'album':
                return this.createMediaAlbum(item) as T;

            case 'playlist':
                return this.createMediaPlaylist(item) as T;

            case 'track':
                return this.createMediaItemFromTrack(item) as T;
        }
    }

    private createMediaItemFromEpisode(episode: SpotifyEpisode): MediaItem {
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: episode.uri,
            externalUrl: episode.external_urls.spotify,
            title: episode.name,
            duration: episode.duration_ms / 1000,
            thumbnails: episode.images as Thumbnail[],
            unplayable: episode.is_playable === false,
            playedAt: episode.played_at
                ? Math.floor((new Date(episode.played_at).getTime() || 0) / 1000)
                : 0,
        };
    }

    private createMediaAlbum(album: SpotifyAlbum): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: album.uri,
            externalUrl: album.external_urls.spotify,
            title: album.name,
            artist: album.artists.map((artist) => artist.name).join(', '),
            // genres: album.genres, // always an empty array
            year: new Date(album.release_date).getFullYear(),
            thumbnails: album.images as Thumbnail[],
            trackCount: album.tracks?.total,
            pager: this.createAlbumPager(album),
        };
    }

    private createMediaArtist(artist: SpotifyArtist): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: artist.uri,
            externalUrl: artist.external_urls.spotify,
            title: artist.name,
            genres: artist.genres,
            thumbnails: artist.images as Thumbnail[],
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createArtistTopTracks(artist: SpotifyArtist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            src: `spotify:top-tracks:${artist.id}`,
            externalUrl: '',
            title: 'Top Tracks',
            artist: artist.name,
            thumbnails: artist.images as Thumbnail[],
            pager: this.createTopTracksPager(artist),
        };
    }

    private createMediaPlaylist(playlist: SpotifyPlaylist): MediaPlaylist {
        const isOwn = playlist.owner.id === spotifySettings.getString('userId');

        return {
            itemType: ItemType.Playlist,
            src: playlist.uri,
            externalUrl: playlist.external_urls.spotify,
            title: playlist.name,
            description: playlist.description ? getTextFromHtml(playlist.description) : undefined,
            thumbnails: playlist.images as Thumbnail[],
            trackCount: playlist.tracks.total,
            pager: this.createPlaylistPager(playlist),
            rating: isOwn ? 0 : 1,
            owner: {
                name: playlist.owner.display_name || '',
                url: playlist.owner.external_urls.spotify,
            },
            isPinned: pinStore.isPinned(playlist.uri),
            isOwn,
        };
    }

    private createMediaItemFromTrack(track: SpotifyTrack): MediaItem {
        const album = /album|compilation/i.test(track.album?.album_type || '')
            ? track.album
            : undefined;

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: track.uri,
            externalUrl: track.external_urls.spotify,
            title: track.name,
            artists: track.artists?.map((artist) => artist.name),
            albumArtist: album?.artists.map((artist) => artist.name).join(', '),
            album: album?.name,
            duration: track.duration_ms / 1000,
            playedAt: track.played_at
                ? Math.floor((new Date(track.played_at).getTime() || 0) / 1000)
                : 0,
            genres: (track.album as any)?.genres,
            // disc: album ? track.disc_number : undefined,
            track: album ? track.track_number : undefined,
            year: track.album
                ? new Date(track.album.release_date).getUTCFullYear() || undefined
                : undefined,
            isrc: track.external_ids?.isrc,
            thumbnails: track.album?.images as Thumbnail[],
            unplayable: track.is_playable === false,
        };
    }

    private createArtistAlbumsPager(artist: SpotifyArtist): Pager<MediaAlbum> {
        const market = this.getMarket();
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimpleMediaPager([topTracks]);
        const albumsPager = new SpotifyPager<MediaAlbum>(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getArtistAlbums(artist.id, {
                    offset,
                    limit,
                    market,
                    include_groups: 'album,compilation,single',
                });
                return {items: items as SpotifyAlbum[], total, next};
            }
        );
        return new DualPager(topTracksPager, albumsPager);
    }

    private createTopTracksPager(artist: SpotifyArtist): Pager<MediaItem> {
        const market = this.getMarket();
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {tracks} = await spotifyApi.getArtistTopTracks(artist.id, market, {
                offset,
                limit,
                market,
            });
            return {items: tracks as SpotifyTrack[], next: ''};
        });
    }

    private createAlbumPager(album: SpotifyAlbum): Pager<MediaItem> {
        const tracks = album.tracks?.items;
        if (tracks && tracks.length === album.total_tracks) {
            const items = tracks.map((track) =>
                this.createMediaItemFromTrack({
                    ...track,
                    album: album as SpotifyApi.AlbumObjectSimplified,
                })
            );
            const pager = new SimpleMediaPager(items);
            this.addRatings(items);
            return pager;
        } else {
            const market = this.getMarket();
            return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getAlbumTracks(album.id, {
                    offset,
                    limit,
                    market,
                });
                return {
                    items: items.map((item) => ({
                        ...item,
                        album: album as SpotifyApi.AlbumObjectSimplified,
                    })),
                    total,
                    next,
                };
            });
        }
    }

    private createPlaylistPager(playlist: SpotifyPlaylist): Pager<MediaItem> {
        const tracks = playlist.tracks?.items;
        if (tracks && tracks.length === playlist.tracks.total) {
            const items = tracks.map((item) =>
                this.createMediaItemFromTrack(item.track as SpotifyTrack)
            );
            const pager = new SimpleMediaPager(items);
            this.addRatings(items);
            return pager;
        } else {
            const market = this.getMarket();
            return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getPlaylistTracks(playlist.id, {
                    offset,
                    limit,
                    market,
                });
                return {items: items.map((item) => item.track), total, next};
            });
        }
    }

    private getMarket(): string {
        return spotifySettings.getString('market');
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

    private async addRatings<T extends MediaObject>(items: readonly T[]): Promise<void> {
        const item = items[0];
        if (item && spotify.canRate(item) && item.itemType !== ItemType.Playlist) {
            const ids = items.map((item) => {
                const [, , id] = item.src.split(':');
                return id;
            });
            let ratings: boolean[] = [];
            if (item.itemType === ItemType.Album) {
                ratings = await spotifyApi.containsMySavedAlbums(ids);
            } else {
                ratings = await spotifyApi.containsMySavedTracks(ids);
            }
            const changes: RatingChange[] = [];
            items.forEach((item, index) =>
                changes.push({src: item.src, rating: ratings[index] ? 1 : 0})
            );
            dispatchRatingChanges(changes);
        }
    }
}
