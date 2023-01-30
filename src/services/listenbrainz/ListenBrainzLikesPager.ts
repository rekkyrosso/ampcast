import type {Observable} from 'rxjs';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import {musicBrainzHost} from 'services/musicbrainz';
import SequentialPager from 'services/pagers/SequentialPager';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

export default class ListenBrainzLikesPager implements Pager<MediaItem> {
    static maxPageSize = 100;
    private readonly pager: SequentialPager<MediaItem>;

    constructor() {
        const score = 1;
        const metadata = true;
        const pageSize = 50;
        let offset = 0;

        this.pager = new SequentialPager<MediaItem>(
            async (count = pageSize): Promise<Page<MediaItem>> => {
                try {
                    const response =
                        await listenbrainzApi.get<ListenBrainz.User.UserFeedbackResponse>(
                            `feedback/user/${listenbrainzSettings.userId}/get-feedback`,
                            {score, metadata, offset, count}
                        );
                    offset += count;
                    const items = this.createItems(response.feedback);
                    const total = response.total_count;
                    const atEnd = response.offset + items.length >= total;
                    return {items, total, atEnd};
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

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeItems(): Observable<readonly MediaItem[]> {
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

    private createItems(items: readonly ListenBrainz.User.Feedback[]): MediaItem[] {
        return items.map((item) => this.createItem(item));
    }

    private createItem(item: ListenBrainz.User.Feedback): MediaItem {
        const data = item.track_metadata;
        const info = data.additional_info;
        const mbid = item.recording_mbid;

        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `listenbrainz:track:${nanoid()}`,
            title: data.track_name,
            artists: data.artist_name ? [data.artist_name] : undefined,
            albumArtist: info?.release_artist_name,
            album: data.release_name,
            duration:
                info?.duration || (info?.duration_ms ? Math.round(info.duration_ms / 1000) : 0),
            track: info?.tracknumber || info?.track_number,
            // disc: info?.discnumber,
            isrc: info?.isrc,
            externalUrl: mbid ? `${musicBrainzHost}/recording/${mbid}` : '',
            recording_mbid: mbid,
            recording_msid: item.recording_msid || undefined,
            release_mbid: data.mbid_mapping?.release_mbid,
            artist_mbids: data.mbid_mapping?.artist_mbids,
            playedAt: 0,
            rating: 1,
        };
    }

    private isNoContentError(err: any): boolean {
        return err?.status === 204;
    }
}
