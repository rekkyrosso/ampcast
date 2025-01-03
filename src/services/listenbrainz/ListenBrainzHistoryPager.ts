import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    Subscription,
    distinctUntilChanged,
    from,
    mergeMap,
    skipWhile,
    tap,
} from 'rxjs';
import getYouTubeID from 'get-youtube-id';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import Pager, {Page} from 'types/Pager';
import {getMediaLookupServices} from 'services/mediaServices';
import {musicBrainzHost} from 'services/musicbrainz';
import SequentialPager from 'services/pagers/SequentialPager';
import youtubeApi from 'services/youtube/youtubeApi';
import {Logger} from 'utils';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

const logger = new Logger('ListenBrainzHistoryPager');

export default class ListenBrainzHistoryPager implements Pager<MediaItem> {
    static maxPageSize = 100;
    private readonly pager: SequentialPager<MediaItem>;
    private readonly size$ = new BehaviorSubject<number>(-1);
    private nextPageParams: Record<string, string | number> | undefined = undefined;
    private subscriptions?: Subscription;

    constructor(
        params?: ListenBrainz.User.ListensParams,
        private readonly fetchListenCount = false
    ) {
        this.pager = new SequentialPager<MediaItem>(
            async (count: number): Promise<Page<MediaItem>> => {
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
            {pageSize: 50}
        );
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

    observeItems(): Observable<readonly MediaItem[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.size$.pipe(
            skipWhile((size) => size === -1),
            distinctUntilChanged()
        );
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
        this.subscriptions?.unsubscribe();
    }

    fetchAt(index: number, length: number): void {
        if (!this.subscriptions) {
            this.connect();
        }

        this.pager.fetchAt(index, length);
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            this.subscriptions.add(
                this.pager
                    .observeAdditions()
                    .pipe(mergeMap((items) => listenbrainzApi.addUserData(items)))
                    .subscribe(logger)
            );

            if (this.fetchListenCount) {
                this.subscriptions.add(
                    from(listenbrainzApi.getListenCount())
                        .pipe(tap((total) => this.size$.next(total)))
                        .subscribe(logger)
                );
            }
        }
    }

    private createItems(items: readonly ListenBrainz.Listen[]): MediaItem[] {
        return items.map((item) => this.createItem(item));
    }

    private createItem(item: ListenBrainz.Listen): MediaItem {
        const data = item.track_metadata;
        const {additional_info: info, mbid_mapping: mbids} = data;
        const mbid = data.mbid_mapping?.recording_mbid || undefined;
        const playableSrc = this.getPlayableSrc(info) || '';

        return {
            itemType: ItemType.Media,
            mediaType: playableSrc.startsWith('youtube:') ? MediaType.Video : MediaType.Audio,
            src: `listenbrainz:listen:${item.listened_at}`,
            title: data.track_name,
            addedAt: item.inserted_at,
            artists: data.artist_name ? [data.artist_name] : undefined,
            albumArtist: info?.release_artist_name,
            album: data.release_name,
            duration:
                info?.duration || (info?.duration_ms ? Math.round(info.duration_ms / 1000) : 0),
            track: info?.tracknumber || info?.track_number,
            disc: info?.discnumber,
            isrc: info?.isrc,
            externalUrl: mbid ? `${musicBrainzHost}/recording/${mbid}` : undefined,
            recording_mbid: mbid,
            recording_msid: item.recording_msid || undefined,
            release_mbid: mbids?.release_mbid,
            artist_mbids: mbids?.artist_mbids,
            caa_mbid: mbids?.caa_release_mbid,
            playedAt: item.listened_at,
            link: {
                src: playableSrc,
                externalUrl: this.getExternalUrl(info?.origin_url),
            },
        };
    }

    private getExternalUrl(url: string | undefined): string | undefined {
        if (url) {
            if (/youtu\.?be/.test(url)) {
                const videoId = getYouTubeID(url);
                if (videoId) {
                    return youtubeApi.getVideoUrl(videoId);
                }
            }
        }
        return url || undefined;
    }

    private getPlayableSrc(
        info: ListenBrainz.TrackMetadata['additional_info']
    ): string | undefined {
        if (info) {
            if (info.spotify_id) {
                return this.getSpotifySrc(info.spotify_id);
            }
            const url = info.origin_url;
            if (url) {
                if (url.includes('apple.com')) {
                    return this.getAppleSrc(url);
                }
                if (url.includes('spotify.com')) {
                    return this.getSpotifySrc(url);
                }
                if (url.includes('tidal.com')) {
                    return 'tidal:';
                }
                if (/youtu\.?be/.test(url)) {
                    return youtubeApi.getVideoSrc(url);
                }
            }
            const musicServiceName = info.music_service_name?.toLowerCase();
            if (musicServiceName) {
                const lookupServiceIds = getMediaLookupServices().map((service) => service.id);
                for (const serviceId of lookupServiceIds) {
                    if (musicServiceName.includes(serviceId)) {
                        return `${serviceId}:`;
                    }
                }
            }
        }
    }

    private getAppleSrc(url: string): string | undefined {
        if (url) {
            const id = url.split('i=').pop();
            if (id) {
                return `apple:song:${id}`;
            }
        }
    }

    private getSpotifySrc(url: string): string | undefined {
        if (url) {
            const id = url.split('/').pop();
            if (id) {
                return `spotify:track:${id}`;
            }
        }
    }

    private isNoContentError(err: any): boolean {
        return err?.status === 204;
    }
}
