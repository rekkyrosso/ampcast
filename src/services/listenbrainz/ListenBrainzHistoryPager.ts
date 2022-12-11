import type {Observable} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import {enhanceWithListenData} from 'services/localdb/listens';
import SequentialPager from 'services/pagers/SequentialPager';
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
                try {
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
                    this.nextPageParams = atEnd
                        ? undefined
                        : {max_ts: listens.at(-1)!.listened_at - 1};
                    return {items, atEnd};
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

    private createItems(items: readonly ListenBrainz.Listen[]): MediaItem[] {
        return items.map((item) => this.createItem(item));
    }

    private createItem(item: ListenBrainz.Listen): MediaItem {
        const data = item.track_metadata;
        const info = data.additional_info;
        const mbid = data.mbid_mapping?.recording_mbid || undefined;

        // examples:
        // listening_from: "Plex/lastfm/jellyfin/Rhythmbox/..."
        // origin_url: "https://anyband.bandcamp.com/album/..."

        return enhanceWithListenData({
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `listenbrainz:listen:${item.listened_at}`,
            title: data.track_name,
            addedAt: item.inserted_at,
            artist: data.artist_name,
            albumArtist: info?.release_artist_name,
            album: data.release_name,
            duration:
                info?.duration || (info?.duration_ms ? Math.round(info.duration_ms / 1000) : 0),
            track: info?.tracknumber || info?.track_number,
            disc: info?.discnumber,
            isrc: info?.isrc,
            externalUrl: mbid ? `https://musicbrainz.org/recording/${mbid}` : undefined,
            recording_mbid: mbid,
            release_mbid: data.mbid_mapping?.release_mbid,
            playedAt: item.listened_at,
            link: {
                src: this.getPlayableSrc(info) || '',
                externalUrl: info?.origin_url,
            },
        });
    }

    private getPlayableSrc(
        info: ListenBrainz.TrackMetadata['additional_info']
    ): string | undefined {
        if (info) {
            if (info.spotify_id) {
                return this.getSpotifySrc(info.spotify_id);
            }
            if (info.origin_url?.includes('spotify.com')) {
                return this.getSpotifySrc(info.origin_url);
            }
            if (info.origin_url?.includes('apple.com')) {
                return this.getAppleSrc(info.origin_url);
            }
            const musicServiceName = info.music_service_name?.toLowerCase() || '';
            const serviceIds = 'jellyfin|spotify|youtube|apple|plex'.split('|');
            for (const serviceId of serviceIds) {
                if (musicServiceName.includes(serviceId)) {
                    return `${serviceId}:`;
                }
            }
        }
    }

    private getSpotifySrc(href: string): string | undefined {
        if (href) {
            const id = href.split('/').pop();
            if (id) {
                return `spotify:track:${id}`;
            }
        }
    }

    private getAppleSrc(href: string): string | undefined {
        if (href) {
            const id = href.split('i=').pop();
            if (id) {
                return `apple:song:${id}`;
            }
        }
    }

    private isNoContentError(err: any): boolean {
        return err?.status === 204;
    }
}
