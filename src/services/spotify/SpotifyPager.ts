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
import SimplePager from 'services/SimplePager';
import {
    SpotifyAlbum,
    spotifyApi,
    SpotifyArtist,
    SpotifyEpisode,
    SpotifyItem,
    SpotifyPlaylist,
    SpotifyTrack,
} from './spotify';
import {authSettings, refreshToken} from './spotifyAuth';

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
    private pageNumber = 1;

    constructor(
        fetch: (offset: number, limit: number) => Promise<SpotifyPage>,
        options?: Partial<PagerConfig>
    ) {
        const config = {...this.defaultConfig, ...options};

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
            config
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
    }

    fetchAt(index: number, length: number): void {
        this.pager.fetchAt(index, length);
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
            artist: album.artists.map((album) => album.name).join('/'),
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
            thumbnails: artist.images as Thumbnail[],
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createMediaPlaylist(playlist: SpotifyPlaylist): MediaPlaylist {
        return {
            itemType: ItemType.Playlist,
            src: playlist.uri,
            externalUrl: playlist.external_urls.spotify,
            title: playlist.name,
            thumbnails: playlist.images as Thumbnail[],
            trackCount: playlist.tracks.total,
            pager: this.createPlaylistPager(playlist),
            owner: {
                name: playlist.owner.display_name || '',
                url: playlist.owner.external_urls.spotify,
            },
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
            artist: track.artists.map((artist) => artist.name).join('/'),
            albumArtist: album?.artists[0]?.name,
            album: album?.name,
            duration: track.duration_ms / 1000,
            playedAt: track.played_at
                ? Math.floor((new Date(track.played_at).getTime() || 0) / 1000)
                : 0,
            genre: (track.album as any)?.genres?.join(';'),
            disc: album ? track.disc_number : undefined,
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
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total, next} = await spotifyApi.getArtistAlbums(artist.id, {
                offset,
                limit,
                market,
            });
            return {items: items as SpotifyAlbum[], total, next};
        });
    }

    private createAlbumPager(album: SpotifyAlbum): Pager<MediaItem> {
        const tracks = album.tracks?.items;
        if (tracks && tracks.length === album.total_tracks) {
            const tracks = album.tracks?.items;
            return new SimplePager(
                tracks.map((track) =>
                    this.createMediaItemFromTrack({
                        ...track,
                        album: album as SpotifyApi.AlbumObjectSimplified,
                    })
                )
            );
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

    private getMarket(): string {
        return authSettings.getItem('market') || '';
    }
}
