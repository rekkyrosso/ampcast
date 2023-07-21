import type {Observable} from 'rxjs';
import {Subscription, mergeMap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import libraryStore from 'services/actions/libraryStore';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import WrappedPager from 'services/pagers/WrappedPager';
import pinStore from 'services/pins/pinStore';
import {exists, getTextFromHtml, Logger, sleep} from 'utils';
import spotify, {
    SpotifyAlbum,
    SpotifyArtist,
    SpotifyEpisode,
    SpotifyItem,
    SpotifyPlaylist,
    SpotifyTrack,
} from './spotify';
import spotifyApi from './spotifyApi';
import {refreshToken} from './spotifyAuth';
import {userSettings} from './spotifySettings';

const logger = new Logger('SpotifyPager');

export interface SpotifyPage extends Page<SpotifyItem> {
    readonly next?: string | undefined;
}

export default class SpotifyPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 50;

    private readonly pager: SequentialPager<T>;
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
        options?: Partial<PagerConfig>,
        inLibrary?: boolean | undefined
    ) {
        this.config = {...this.defaultConfig, ...options};

        this.pager = new SequentialPager<T>(
            async (limit = this.defaultConfig.pageSize!): Promise<Page<T>> => {
                const offset = (this.pageNumber - 1) * limit;
                const fetchPage = async () => {
                    const {items, total, next} = await fetch(offset, limit);
                    this.pageNumber++;
                    return {
                        items: items.map((item) => this.createMediaObject(item, inLibrary)),
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
                    } else if (err.status === 429) {
                        const retryAfter = Number(err.headers?.get('Retry-After'));
                        if (retryAfter && retryAfter <= 10) {
                            await sleep(retryAfter * 1000);
                            const page = await fetchPage();
                            return page;
                        } else {
                            throw err;
                        }
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
                this.subscriptions.add(
                    this.pager
                        .observeAdditions()
                        .pipe(mergeMap((items) => this.addInLibrary(items)))
                        .subscribe(logger)
                );
            }
        }
    }

    private createMediaObject(item: SpotifyItem, inLibrary?: boolean | undefined): T {
        switch (item.type) {
            case 'episode':
                return this.createMediaItemFromEpisode(item) as T;

            case 'artist':
                return this.createMediaArtist(item) as T;

            case 'album':
                return this.createMediaAlbum(item, inLibrary) as T;

            case 'playlist':
                return this.createMediaPlaylist(item, inLibrary) as T;

            case 'track':
                return this.createMediaItemFromTrack(item, inLibrary) as T;
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

    private createMediaAlbum(album: SpotifyAlbum, inLibrary?: boolean | undefined): MediaAlbum {
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
            inLibrary: libraryStore.get(album.uri, inLibrary),
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
            title: 'Top Tracks',
            artist: artist.name,
            thumbnails: artist.images as Thumbnail[],
            pager: this.createTopTracksPager(artist),
            synthetic: true,
        };
    }

    private createMediaPlaylist(
        playlist: SpotifyPlaylist,
        inLibrary?: boolean | undefined
    ): MediaPlaylist {
        const isOwn = playlist.owner.id === userSettings.getString('userId');

        return {
            itemType: ItemType.Playlist,
            src: playlist.uri,
            externalUrl: playlist.external_urls.spotify,
            title: playlist.name,
            description: playlist.description ? getTextFromHtml(playlist.description) : undefined,
            thumbnails: playlist.images as Thumbnail[],
            trackCount: playlist.tracks.total,
            pager: this.createPlaylistPager(playlist),
            owner: {
                name: playlist.owner.display_name || '',
                url: playlist.owner.external_urls.spotify,
            },
            isPinned: pinStore.isPinned(playlist.uri),
            isOwn,
            inLibrary: isOwn ? false : libraryStore.get(playlist.uri, inLibrary),
        };
    }

    private createMediaItemFromTrack(
        track: SpotifyTrack,
        inLibrary?: boolean | undefined
    ): MediaItem {
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
            disc: track.disc_number,
            track: track.track_number,
            year: track.album
                ? new Date(track.album.release_date).getUTCFullYear() || undefined
                : undefined,
            isrc: track.external_ids?.isrc,
            thumbnails: track.album?.images as Thumbnail[],
            unplayable: track.is_playable === false,
            inLibrary: libraryStore.get(track.uri, inLibrary),
        };
    }

    private createArtistAlbumsPager(artist: SpotifyArtist): Pager<MediaAlbum> {
        const market = this.getMarket();
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimplePager([topTracks]);
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
        return new WrappedPager(topTracksPager, albumsPager);
    }

    private createTopTracksPager(artist: SpotifyArtist): Pager<MediaItem> {
        const market = this.getMarket();
        return new SpotifyPager(
            async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {tracks} = await spotifyApi.getArtistTopTracks(artist.id, market, {
                    offset,
                    limit,
                    market,
                });
                return {items: tracks as SpotifyTrack[], next: ''};
            },
            {pageSize: 10, maxSize: 10}
        );
    }

    private createAlbumPager(album: SpotifyAlbum): Pager<MediaItem> {
        const tracks = album.tracks?.items;
        if (tracks && tracks.length === album.total_tracks) {
            return new SimpleMediaPager(() => {
                const items = tracks.map((track) =>
                    this.createMediaItemFromTrack({
                        ...track,
                        album: album as SpotifyApi.AlbumObjectSimplified,
                    })
                );
                this.addInLibrary(items);
                return items;
            });
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
            return new SimpleMediaPager(() => {
                const items = tracks
                    .filter((item) => !!item.track)
                    .map((item) => this.createMediaItemFromTrack(item.track as SpotifyTrack));
                this.addInLibrary(items);
                return items;
            });
        } else {
            const market = this.getMarket();
            return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total, next} = await spotifyApi.getPlaylistTracks(playlist.id, {
                    offset,
                    limit,
                    market,
                });
                return {items: items.map((item) => item.track).filter(exists), total, next};
            });
        }
    }

    private getMarket(): string {
        return userSettings.getString('market');
    }

    private async addInLibrary<T extends MediaObject>(items: readonly T[]): Promise<void> {
        const item = items[0];
        if (item) {
            const ids = items
                .filter((item) => item.inLibrary === undefined && spotify.canStore(item, true))
                .map((item) => {
                    const [, , id] = item.src.split(':');
                    return id;
                });
            if (ids.length === 0) {
                return;
            }
            let inLibrary: boolean[] = [];
            if (item.itemType === ItemType.Album) {
                inLibrary = await spotifyApi.containsMySavedAlbums(ids);
            } else {
                inLibrary = await spotifyApi.containsMySavedTracks(ids);
            }

            mediaObjectChanges.dispatch(
                items.map(({src}, index) => ({
                    match: (item: MediaObject) => item.src === src,
                    values: {inLibrary: inLibrary[index]},
                }))
            );
        }
    }
}
