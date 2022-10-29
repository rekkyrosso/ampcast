import {nanoid} from 'nanoid';
import type {Observable} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import SequentialPager from 'services/SequentialPager';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

export default class ListenBrainzHistoryPager implements Pager<MediaItem> {
    static maxPageSize = 100;
    private readonly pager: Pager<MediaItem>;
    private nextPageParams: Record<string, string | number> | undefined = undefined;

    constructor(params?: ListenBrainz.User.ListensParams) {
        const pageSize = 50;
        this.pager = new SequentialPager<MediaItem>(
            async (count = pageSize): Promise<Page<MediaItem>> => {
                const {payload} = await listenbrainzApi.get<ListenBrainz.User.Listens>(
                    `user/${listenbrainzSettings.userId}/listens`,
                    {
                        ...params,
                        count,
                        ...this.nextPageParams,
                    }
                );
                const listens = payload.listens;
                const items = this.createItems(listens);
                const atEnd = items.length < count;
                this.nextPageParams = atEnd ? undefined : {min_ts: listens.at(-1)!.listened_at - 1};
                return {items, atEnd};
            },
            {pageSize}
        );
    }

    observeComplete(): Observable<readonly MediaItem[]> {
        return this.pager.observeComplete();
    }

    observeItems(): Observable<readonly MediaItem[]> {
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

    private createItems(items: readonly ListenBrainz.Listen[]): MediaItem[] {
        return items.map((item) => this.createItem(item));
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
