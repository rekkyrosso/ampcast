import {nanoid} from 'nanoid';
import type {Observable} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Pager, {Page, PagerConfig} from 'types/Pager';
import SequentialPager from 'services/SequentialPager';
import listenbrainzApi from './listenbrainzApi';

export interface ListenBrainzPage extends Page<any> {
    readonly nextPageParams?: Record<string, string | number>;
}

export default class ListenBrainzPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static maxPageSize = 100;

    private readonly pager: Pager<T>;
    private readonly defaultConfig: PagerConfig = {
        minPageSize: ListenBrainzPager.minPageSize,
        maxPageSize: ListenBrainzPager.maxPageSize,
        pageSize: ListenBrainzPager.maxPageSize,
    };
    private nextPageParams: Record<string, string | number> | undefined = undefined;

    constructor(
        path: string,
        map: (response: any) => ListenBrainzPage,
        params?: Record<string, string | number>,
        options?: PagerConfig
    ) {
        const config = {...this.defaultConfig, ...options};
        this.pager = new SequentialPager<T>(async (count = config.pageSize): Promise<Page<T>> => {
            const response = await listenbrainzApi.get(path, {...params, count, ...this.nextPageParams});
            const result = map(response);
            const items = this.createItems(result.items);
            const total = result.total;
            const atEnd = !result.nextPageParams;
            this.nextPageParams = result.nextPageParams;
            return {items, total, atEnd};
        }, config);
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

    private createItems(items: readonly ListenBrainz.Listen[]): T[] {
        return items.map((item) => this.createItem(item) as T);
    }

    private createItem(item: ListenBrainz.Listen): MediaItem {
        const data = item.track_metadata;
        const info = data.additional_info;

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `listenbrainz:listen:${nanoid()}`,
            title: data.track_name,
            addedAt: item.inserted_at,
            artist: data.artist_name,
            albumArtist: info?.release_artist_name,
            album: data.release_name,
            duration:
                info?.duration || (info?.duration_ms ? Math.round(info.duration_ms / 1000) : 0),
            track: info?.tracknumber,
            disc: info?.discnumber,
            isrc: info?.isrc,
            recording_mbid: data.mbid_mapping?.recording_mbid,
            release_mbid: data.mbid_mapping?.release_mbid,
            externalUrl: info?.origin_url,
            playedAt: item.listened_at,
        };
    }
}
