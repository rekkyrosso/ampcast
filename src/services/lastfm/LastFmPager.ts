import type {Observable} from 'rxjs';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import {enhanceWithListenData} from 'services/localdb/listens';
import DualPager from 'services/pagers/DualPager';
import SequentialPager from 'services/pagers/SequentialPager';
import SimplePager from 'services/pagers/SimplePager';
import {exists} from 'utils';
import lastfmApi from './lastfmApi';
import lastfmSettings from './lastfmSettings';

const lastfmPlaceholderImage = '2a96cbd8b46e442fc41c2b86b821562f.png';

export interface LastFmPage extends Page<LastFm.MediaObject> {
    readonly itemType: ItemType;
}

export interface LastFmPagerConfig extends PagerConfig {
    readonly playCountName?: 'playcount' | 'userplaycount';
}

export default class LastFmPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 200;

    private readonly pager: Pager<T>;
    private readonly defaultConfig: PagerConfig = {
        minPageSize: LastFmPager.minPageSize,
        maxPageSize: LastFmPager.maxPageSize,
        pageSize: 50,
    };
    private pageNumber = 1;
    private readonly playCountName: 'playcount' | 'userplaycount' = 'playcount';

    constructor(
        initialParams: Record<string, string | number>,
        map: (response: any) => LastFmPage,
        options?: LastFmPagerConfig
    ) {
        const config = {...this.defaultConfig, ...options};

        const {page, ...params} = initialParams;
        this.pageNumber = Number(page) || 1;

        this.playCountName = config.playCountName || 'playcount';

        this.pager = new SequentialPager<T>(
            async (limit = this.defaultConfig.pageSize): Promise<Page<T>> => {
                const page = this.pageNumber;
                const result = await lastfmApi.get({...params, page, limit});
                this.pageNumber++;
                const {items, total, atEnd, itemType} = map(result);
                return {
                    items: this.createMediaObjects(itemType, items),
                    total,
                    atEnd,
                };
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

            case ItemType.Playlist:
                return [];
        }
    }

    private createMediaItem(track: LastFm.Track): MediaItem {
        const playedAt = track.date ? Number(track.date.uts) || 0 : 0;

        return enhanceWithListenData({
            ...(this.createMediaObject(ItemType.Media, track) as MediaItem),
            mediaType: MediaType.Audio,
            src: playedAt ? `lastfm:listen:${playedAt}` : `lastfm:track:${nanoid()}`,
            artists: track.artist ? [track.artist.name] : undefined,
            album: track.album?.['#text'],
            duration: Number(track.duration) || 0,
            playedAt,
        });
    }

    private createMediaAlbum(album: LastFm.Album): MediaAlbum {
        return {
            ...(this.createMediaObject(ItemType.Album, album) as MediaAlbum),
            src: `lastfm:album:${nanoid()}`,
            artist: album.artist.name,
            year: album.wiki?.published
                ? new Date(album.wiki.published).getFullYear() || undefined
                : undefined,
            pager: this.createAlbumPager(album),
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
            thumbnails: this.createThumbnails(artist.image),
            src: `lastfm:top-tracks:${nanoid()}`,
            externalUrl: '',
            artist: artist.name,
            pager: this.createTopTracksPager(artist),
        };
    }

    private createMediaObject(itemType: ItemType, item: LastFm.MediaObject): Partial<MediaObject> {
        return {
            itemType: itemType,
            title: item.name,
            rating: 'loved' in item ? Number(item.loved) || 0 : undefined,
            playCount: Number(item[this.playCountName]) || undefined,
            globalPlayCount:
                this.playCountName === 'userplaycount'
                    ? Number(item.playcount) || undefined
                    : undefined,
            thumbnails: this.createThumbnails(item.image),
            externalUrl: item.url || '',
        };
    }

    private createThumbnails(thumbs: readonly LastFm.Thumbnail[]): Thumbnail[] | undefined {
        const result = thumbs
            ? [
                  this.createThumbnail(thumbs[0], 34),
                  this.createThumbnail(thumbs[1], 64),
                  this.createThumbnail(thumbs[2], 174),
                  this.createThumbnail(thumbs[3], 300),
              ].filter(exists)
            : [];

        return result.length === 0 ? undefined : result;
    }

    private createThumbnail(
        thumb: LastFm.Thumbnail,
        width: number,
        height = width
    ): Thumbnail | undefined {
        if (thumb) {
            const url = thumb['#text'] as string;
            if (url && !url.endsWith(lastfmPlaceholderImage)) {
                return {url, width, height};
            }
        }
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
        return new DualPager(topTracksPager, albumsPager);
    }

    private createAlbumPager(album: LastFm.Album): Pager<MediaItem> {
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
            {playCountName: 'userplaycount'}
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
            {maxSize: 20}
        );
    }
}
