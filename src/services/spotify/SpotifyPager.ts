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
import {createEmptyMediaObject} from 'utils';
import {
    SpotifyAlbum,
    spotifyApi,
    SpotifyArtist,
    SpotifyEpisode,
    SpotifyItem,
    SpotifyPlaylist,
    SpotifyTrack,
} from './spotify';
import {refreshToken} from './spotifyAuth';

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
                    const {items, total} = await fetch(offset, limit);
                    this.pageNumber++;
                    return {
                        items: items.map((item) => this.createMediaObject(item)),
                        total,
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

    observeComplete(): Observable<readonly T[]> {
        return this.pager.observeComplete();
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeMaxSize(): Observable<number> {
        return this.pager.observeMaxSize();
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
            ...createEmptyMediaObject(ItemType.Media),
            mediaType: MediaType.Audio,
            src: episode.uri,
            externalUrl: episode.external_urls.spotify,
            title: episode.name,
            duration: episode.duration_ms / 1000,
            thumbnails: episode.images as Thumbnail[],
        };
    }

    private createMediaAlbum(album: SpotifyAlbum): MediaAlbum {
        return {
            ...createEmptyMediaObject(ItemType.Album),
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
            ...createEmptyMediaObject(ItemType.Artist),
            src: artist.uri,
            externalUrl: artist.external_urls.spotify,
            title: artist.name,
            thumbnails: artist.images as Thumbnail[],
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createMediaPlaylist(playlist: SpotifyPlaylist): MediaPlaylist {
        return {
            ...createEmptyMediaObject(ItemType.Playlist),
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
        const album = /album|compilation/i.test(track.album?.album_type || '') ? track.album : null;

        return {
            ...createEmptyMediaObject(ItemType.Media),
            mediaType: MediaType.Audio,
            src: track.uri,
            // unplayable: track.available_markets?.length === 0,
            externalUrl: track.external_urls.spotify,
            title: track.name,
            artist: track.artists.map((artist) => artist.name).join('/'),
            albumArtist: album?.artists[0]?.name,
            album: album?.name,
            duration: track.duration_ms / 1000,
            playedOn: track.played_at ? new Date(track.played_at).getTime() || undefined : undefined,
            genre: (track.album as any)?.genres?.join(';'),
            disc: album ? track.disc_number : undefined,
            track: album ? track.track_number : undefined,
            year: track.album ? new Date(track.album.release_date).getFullYear() : undefined,
            thumbnails: track.album?.images as Thumbnail[],
        };
    }

    private createArtistAlbumsPager(artist: SpotifyArtist): Pager<MediaAlbum> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total} = await spotifyApi.getArtistAlbums(artist.id, {
                offset,
                limit,
            });
            return {items: items as SpotifyAlbum[], total};
        });
    }

    private createAlbumPager(album: SpotifyAlbum): Pager<MediaItem> {
        const tracks = album.tracks?.items;
        if (tracks && tracks.length === album.total_tracks) {
            return new SimplePager(tracks.map((track) => this.createMediaItemFromTrack(track)));
        } else {
            return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
                const {items, total} = await spotifyApi.getAlbumTracks(album.id, {
                    offset,
                    limit,
                });
                return {items, total};
            });
        }
    }

    private createPlaylistPager(playlist: SpotifyPlaylist): Pager<MediaItem> {
        return new SpotifyPager(async (offset: number, limit: number): Promise<SpotifyPage> => {
            const {items, total} = await spotifyApi.getPlaylistTracks(playlist.id, {
                offset,
                limit,
            });
            return {items: items.map((item) => item.track), total};
        });
    }
}
