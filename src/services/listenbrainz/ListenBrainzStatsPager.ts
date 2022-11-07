import {nanoid} from 'nanoid';
import type {Observable} from 'rxjs';
import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import Thumbnail from 'types/Thumbnail';
import {enhanceWithListenData} from 'services/localdb/listens';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import MusicBrainzAlbumPager from 'services/musicbrainz/MusicBrainzAlbumPager';
import SequentialPager from 'services/SequentialPager';
import SimplePager from 'services/SimplePager';
import listenbrainzApi from './listenbrainzApi';

export default class ListenBrainzStatsPager<T extends MediaObject> implements Pager<T> {
    private readonly pager: Pager<T>;

    constructor(path: string, params?: Record<string, string | number>) {
        const pageSize = 50;
        let offset = 0;
        this.pager = new SequentialPager<T>(
            async (count = pageSize): Promise<Page<T>> => {
                try {
                    const response = await listenbrainzApi.get<ListenBrainz.Stats.Response>(path, {
                        ...params,
                        offset,
                        count,
                    });
                    offset += count;
                    return this.createPage(response);
                } catch (err) {
                    if (this.isNoContentError(err)) {
                        return {items: [], atEnd: true};
                    }
                    throw err;
                }
            },
            {pageSize}
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

    private createPage(response: ListenBrainz.Stats.Response): Page<T> {
        if (this.isRecordingsResponse(response)) {
            const payload = response.payload;
            const items = payload.recordings.map((item) => this.createMediaItem(item) as T);
            const total = payload.total_recording_count;
            const atEnd = payload.offset + items.length >= total;
            return {items, total, atEnd};
        } else if (this.isReleasesResponse(response)) {
            const payload = response.payload;
            const items = payload.releases.map((item) => this.createMediaAlbum(item) as T);
            const total = payload.total_release_count;
            const atEnd = payload.offset + items.length >= total;
            return {items, total, atEnd};
        } else if (this.isArtistsResponse(response)) {
            const payload = response.payload;
            const items = payload.artists.map((item) => this.createMediaArtist(item) as T);
            const total = payload.total_artist_count;
            const atEnd = payload.offset + items.length >= total;
            return {items, total, atEnd};
        } else {
            throw Error('Unknown response.');
        }
    }

    private createMediaArtist(item: ListenBrainz.Artist): MediaArtist {
        return {
            itemType: ItemType.Artist,
            src: `listenbrainz:artist:${nanoid()}`,
            title: item.artist_name,
            artist_mbids: item.artist_mbids,
            playCount: item.listen_count,
            pager: new SimplePager(),
        };
    }

    private createMediaAlbum(item: ListenBrainz.Release): MediaAlbum {
        const mbid = item.release_mbid || undefined;
        const album: Except<MediaAlbum, 'pager'> = {
            itemType: ItemType.Album,
            src: `listenbrainz:album:${nanoid()}`,
            title: item.release_name,
            artist: item.artist_name,
            release_mbid: mbid,
            artist_mbids: item.artist_mbids,
            playCount: item.listen_count,
            thumbnails: this.createThumbnails(item.release_mbid),
        };
        return {...album, pager: mbid ? new MusicBrainzAlbumPager(mbid, album) : new SimplePager()};
    }

    private createMediaItem(item: ListenBrainz.Recording): MediaItem {
        return enhanceWithListenData({
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `listenbrainz:track:${nanoid()}`,
            title: item.track_name,
            artist: item.artist_name,
            album: item.release_name,
            duration: 0,
            recording_mbid: item.recording_mbid,
            release_mbid: item.release_mbid,
            artist_mbids: item.artist_mbids,
            playCount: item.listen_count,
            playedAt: 0,
            thumbnails: this.createThumbnails(item.release_mbid),
        });
    }

    private createThumbnails(mbid: string | undefined): Thumbnail[] | undefined {
        return mbid ? [musicbrainzApi.getAlbumCover(mbid)] : undefined;
    }

    private isRecordingsResponse(
        response: ListenBrainz.Stats.Response
    ): response is ListenBrainz.Stats.Recordings {
        return 'total_recording_count' in response.payload;
    }

    private isReleasesResponse(
        response: ListenBrainz.Stats.Response
    ): response is ListenBrainz.Stats.Releases {
        return 'total_release_count' in response.payload;
    }

    private isArtistsResponse(
        response: ListenBrainz.Stats.Response
    ): response is ListenBrainz.Stats.Artists {
        return 'total_artist_count' in response.payload;
    }

    private isNoContentError(err: any): boolean {
        return err?.status === 204;
    }
}
