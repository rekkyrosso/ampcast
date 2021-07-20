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
import SequentialPager from 'services/SequentialPager';
import {lf_api_key} from 'services/credentials';
import {createEmptyMediaObject, exists} from 'utils';
import lastfmSettings from './lastfmSettings';

const lastfmApi = `https://ws.audioscrobbler.com/2.0`;
const lastfmPlaceholderImage = '2a96cbd8b46e442fc41c2b86b821562f.png';

type LastFmTrack = any; // No last.fm types yet
type LastFmAlbum = any;
type LastFmArtist = any;
type LastFmItem = LastFmTrack | LastFmAlbum | LastFmArtist;

export interface LastFmPage extends Page<LastFmItem> {
    readonly itemType: ItemType;
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

    constructor(
        path: string,
        map: (response: LastFmItem) => LastFmPage,
        options?: Partial<PagerConfig>,
        private readonly playCountName: 'playcount' | 'userplaycount' = 'playcount'
    ) {
        const config = {...this.defaultConfig, ...options};

        this.pager = new SequentialPager<T>(
            async (limit = this.defaultConfig.pageSize): Promise<Page<T>> => {
                const response = await fetch(
                    `${lastfmApi}?${path}&page=${this.pageNumber}&limit=${limit}`
                );
                this.pageNumber++;
                if (!response.ok) {
                    throw response;
                }
                const result = await response.json();
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

    private createMediaObjects(itemType: ItemType, items: LastFmItem): readonly T[] {
        switch (itemType) {
            case ItemType.Artist:
                return items.map((item: LastFmArtist) => this.createMediaArtist(item));

            case ItemType.Album:
                return items.map((item: LastFmAlbum) => this.createMediaAlbum(item));

            case ItemType.Media:
                return items.map((item: LastFmItem) => this.createMediaItem(item));

            case ItemType.Playlist:
                return [];
        }
    }

    private createMediaItem(track: LastFmTrack): MediaItem {
        return {
            ...(this.createMediaObject(ItemType.Media, track) as MediaItem),
            mediaType: MediaType.Audio,
            src: `lastfm:track:${nanoid()}`, // can't do anything with the source
            artist: track.artist?.name,
            album: track.album?.['#text'],
            duration: Number(track.duration) || 0,
            playedOn: track.date ? track.date.uts * 1000 : undefined,
            unplayable: true,
        };
    }

    private createMediaAlbum(album: LastFmAlbum): MediaAlbum {
        return {
            ...(this.createMediaObject(ItemType.Album, album) as MediaAlbum),
            src: `lastfm:album:${nanoid()}`,
            artist: album.artist.name,
            year: album.wiki?.published
                ? new Date(album.wiki.published).getFullYear() || undefined
                : undefined,
            pager: this.createAlbumPager(album),
            unplayable: true,
        };
    }

    private createMediaArtist(artist: LastFmArtist): MediaArtist {
        return {
            ...(this.createMediaObject(ItemType.Artist, artist) as MediaArtist),
            src: `lastfm:artist:${nanoid()}`,
            pager: this.createArtistAlbumsPager(artist),
        };
    }

    private createMediaObject(itemType: ItemType, item: LastFmItem): Partial<MediaObject> {
        return {
            ...createEmptyMediaObject(itemType),
            title: item.name,
            rating: Number(item.loved) || 0,
            playCount: Number(item[this.playCountName]) || undefined,
            globalPlayCount:
                this.playCountName === 'userplaycount'
                    ? Number(item.playcount) || undefined
                    : undefined,
            thumbnails: this.createThumbnails(item.image),
            externalUrl: item.url,
        };
    }

    private createThumbnails(thumbs: any[]): Thumbnail[] | undefined {
        return thumbs
            ? [
                  this.createThumbnail(thumbs[0], 34),
                  this.createThumbnail(thumbs[1], 64),
                  this.createThumbnail(thumbs[2], 174),
                  this.createThumbnail(thumbs[3], 300),
              ].filter(exists)
            : undefined;
    }

    private createThumbnail(thumb: any, width: number, height = width): Thumbnail | undefined {
        if (thumb) {
            const url = thumb['#text'] as string;
            if (url && !url.endsWith(lastfmPlaceholderImage)) {
                return {url, width, height};
            }
        }
    }

    private createArtistAlbumsPager(artist: LastFmArtist): Pager<MediaAlbum> {
        return new LastFmPager(
            `method=artist.getTopAlbums&artist=${encodeURIComponent(
                artist.name
            )}&api_key=${lf_api_key}&format=json`,
            ({topalbums}: any) => {
                const attr = topalbums['@attr'];
                const items = topalbums.album;
                const total = Number(attr.total) || undefined;
                const atEnd = attr.page === attr.totalPages;
                return {items, total, atEnd, itemType: ItemType.Album};
            },
            {maxSize: 100},
            'userplaycount'
        );
    }

    private createAlbumPager(album: LastFmAlbum): Pager<MediaItem> {
        return new LastFmPager(
            `method=album.getInfo&album=${encodeURIComponent(
                album.name
            )}&artist=${encodeURIComponent(album.artist.name)}&api_key=${lf_api_key}&user=${
                lastfmSettings.userId
            }&format=json`,
            ({album}: any) => {
                if (album.tracks) {
                    const items = album.tracks.track;
                    const total = items.length;
                    const atEnd = true;
                    return {items, total, atEnd, itemType: ItemType.Media};
                } else {
                    throw Error('No track info');
                }
            },
            undefined,
            'userplaycount'
        );
    }
}
