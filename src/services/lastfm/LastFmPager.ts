import type {Observable} from 'rxjs';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import WrappedPager from 'services/pagers/WrappedPager';
import lastfmApi from './lastfmApi';
import lastfmSettings from './lastfmSettings';

export interface LastFmPage extends Page<LastFm.MediaObject> {
    readonly itemType: ItemType;
}

export interface LastFmPagerConfig extends Partial<PagerConfig> {
    readonly playCountName?: 'playcount' | 'userplaycount';
}

export default class LastFmPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 200;

    private readonly pager: SequentialPager<T>;
    private readonly defaultConfig: PagerConfig = {
        pageSize: 50,
    };
    private pageNumber = 1;
    private readonly playCountName: 'playcount' | 'userplaycount' = 'playcount';
    private readonly method: string;

    constructor(
        initialParams: Record<string, string | number>,
        map: (response: any) => LastFmPage,
        options?: LastFmPagerConfig,
        private readonly album?: LastFm.Album
    ) {
        const config = {...this.defaultConfig, ...options};

        const {page, ...params} = initialParams;
        this.pageNumber = Number(page) || 1;
        this.method = initialParams.method as string;

        this.playCountName = config.playCountName || 'playcount';

        this.pager = new SequentialPager<T>(async (limit: number): Promise<Page<T>> => {
            const page = this.pageNumber;
            const result = await lastfmApi.get({...params, page, limit});
            this.pageNumber++;
            const {items, total, atEnd, itemType} = map(result);
            return {
                items: this.createMediaObjects(itemType, items),
                total,
                atEnd,
            };
        }, config);
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    get pageSize(): number {
        return this.pager.pageSize;
    }

    observeBusy(): Observable<boolean> {
        return this.pager.observeBusy();
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

    private createMediaObjects(
        itemType: ItemType,
        items: readonly LastFm.MediaObject[]
    ): readonly T[] {
        switch (itemType) {
            case ItemType.Artist:
                return items.map((item) => this.createMediaArtist(item as LastFm.Artist) as T);

            case ItemType.Album:
                return items.map((item) => this.createMediaAlbum(item as LastFm.Album) as T);

            case ItemType.Media:
                return items.map((item) => this.createMediaItem(item as LastFm.Track) as T);

            default:
                return [];
        }
    }

    private createMediaItem(track: LastFm.Track): MediaItem {
        const playedAt = track.date ? Number(track.date.uts) || 0 : 0;
        const rank = track['@attr']?.rank;
        const isNowPlaying = track['@attr']?.nowplaying === 'true';

        return {
            ...(this.createMediaObject(ItemType.Media, track) as MediaItem),
            mediaType: MediaType.Audio,
            src:
                playedAt || isNowPlaying
                    ? `lastfm:listen:${isNowPlaying ? 'now-playing' : playedAt}`
                    : `lastfm:track:${nanoid()}`,
            artists: track.artist ? [track.artist.name] : undefined,
            album: this.album?.name || track.album?.['#text'],
            albumArtist: this.album?.artist.name,
            release_mbid: this.album?.mbid || track.album?.mbid,
            track_mbid: track.mbid,
            duration: Number(track.duration) || 0,
            track: rank ? Number(rank) || undefined : undefined,
            inLibrary:
                'loved' in track
                    ? !!Number(track.loved)
                    : this.method === 'user.getLovedTracks'
                    ? true
                    : undefined,
            playedAt: isNowPlaying ? -1 : playedAt,
        };
    }

    private createMediaAlbum(album: LastFm.Album): MediaAlbum {
        return {
            ...(this.createMediaObject(ItemType.Album, album) as MediaAlbum),
            src: `lastfm:album:${nanoid()}`,
            artist: album.artist.name,
            year: album.wiki?.published
                ? new Date(album.wiki.published).getFullYear() || undefined
                : undefined,
            pager: this.createAlbumTracksPager(album),
        };
    }

    private createMediaArtist(artist: LastFm.Artist): MediaArtist {
        return {
            ...(this.createMediaObject(ItemType.Artist, artist) as MediaArtist),
            src: `lastfm:artist:${nanoid()}`,
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createArtistTopTracks(artist: LastFm.Artist): MediaAlbum {
        return {
            itemType: ItemType.Album,
            title: 'Top Tracks',
            thumbnails: lastfmApi.createThumbnails(artist.image),
            src: `lastfm:top-tracks:${nanoid()}`,
            artist: artist.name,
            pager: this.createTopTracksPager(artist),
            trackCount: undefined,
            synthetic: true,
        };
    }

    private createMediaObject(itemType: ItemType, item: LastFm.MediaObject): Partial<MediaObject> {
        return {
            itemType: itemType,
            title: item.name,
            playCount: Number(item[this.playCountName]) || undefined,
            globalPlayCount:
                this.playCountName === 'userplaycount'
                    ? Number(item.playcount) || undefined
                    : undefined,
            thumbnails: lastfmApi.createThumbnails(item.image),
            externalUrl: item.url || undefined,
        };
    }

    private createArtistAlbumsPager(artist: LastFm.Artist): Pager<MediaAlbum> {
        const topTracks = this.createArtistTopTracks(artist);
        const topTracksPager = new SimplePager([topTracks]);
        const albumsPager = new LastFmPager<MediaAlbum>(
            {
                method: 'artist.getTopAlbums',
                artist: artist.name,
            },
            ({topalbums}: any) => {
                const attr = topalbums['@attr'];
                const items = topalbums.album;
                const total = Number(attr.total) || undefined;
                const atEnd = attr.page === attr.totalPages;
                return {items, total, atEnd, itemType: ItemType.Album};
            },
            {maxSize: 100, playCountName: 'userplaycount'}
        );
        return new WrappedPager(topTracksPager, albumsPager);
    }

    private createAlbumTracksPager(album: LastFm.Album): Pager<MediaItem> {
        return new LastFmPager(
            {
                method: 'album.getInfo',
                album: album.name,
                artist: album.artist.name,
                user: lastfmSettings.userId,
            },
            ({album}: any) => {
                if (album.tracks) {
                    const track = album.tracks.track;
                    const tracks = track ? (Array.isArray(track) ? track : [track]) : [];
                    const items = tracks.map((item: LastFm.Track) => ({
                        ...item,
                        album: {'#text': album.name},
                        image: item.image || album.image,
                    }));
                    const total = items.length;
                    const atEnd = true;
                    return {items, total, atEnd, itemType: ItemType.Media};
                } else {
                    throw Error('No track info');
                }
            },
            {playCountName: 'userplaycount'},
            album
        );
    }

    private createTopTracksPager(artist: LastFm.Artist): Pager<MediaItem> {
        return new LastFmPager(
            {
                method: 'artist.getTopTracks',
                artist: artist.name,
            },
            ({toptracks}: any) => {
                const attr = toptracks['@attr'];
                const items = toptracks.track;
                const total = Number(attr.total) || undefined;
                const atEnd = attr.page === attr.totalPages;
                return {items, total, atEnd, itemType: ItemType.Media};
            },
            {pageSize: 10, maxSize: 10}
        );
    }
}
