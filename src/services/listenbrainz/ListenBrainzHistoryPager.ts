import {from, mergeMap, tap} from 'rxjs';
import getYouTubeID from 'get-youtube-id';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Page, PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import {getMediaLookupServices} from 'services/mediaServices';
import {musicBrainzHost} from 'services/musicbrainz';
import SequentialPager from 'services/pagers/SequentialPager';
import youtubeApi from 'services/youtube/youtubeApi';
import listenbrainzApi from './listenbrainzApi';
import listenbrainzSettings from './listenbrainzSettings';

const logger = new Logger('ListenBrainzHistoryPager');

export default class ListenBrainzHistoryPager extends SequentialPager<MediaItem> {
    static maxPageSize = 100;

    constructor(
        private readonly type: 'listens' | 'playing-now',
        params?: ListenBrainz.User.ListensParams,
        private readonly fetchListenCount = false,
        options?: Partial<PagerConfig>
    ) {
        let nextPageParams: Record<string, string | number> | undefined = undefined;

        super(
            async (count: number): Promise<Page<MediaItem>> => {
                try {
                    const {payload} = await listenbrainzApi.get<ListenBrainz.User.Listens>(
                        `user/${listenbrainzSettings.userId}/${type}`,
                        {
                            ...params,
                            count,
                            ...nextPageParams,
                        }
                    );
                    const listens = payload.listens;
                    const items = this.createItems(listens);
                    const atEnd = items.length < count;
                    nextPageParams = atEnd ? undefined : {max_ts: listens.at(-1)!.listened_at - 1};
                    return {items, atEnd};
                } catch (err) {
                    if (this.isNoContentError(err)) {
                        return {items: [], atEnd: true};
                    }
                    throw err;
                }
            },
            {pageSize: type === 'playing-now' ? 1 : 100, ...options}
        );
    }

    private get isNowPlaying(): boolean {
        return this.type === 'playing-now';
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            this.subscribeTo(
                this.observeAdditions().pipe(
                    mergeMap((items) => listenbrainzApi.addUserData(items))
                ),
                logger
            );

            if (this.fetchListenCount) {
                this.subscribeTo(
                    from(listenbrainzApi.getListenCount()).pipe(
                        tap((total) => (this.size = total))
                    ),
                    logger
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
        const mbid = data.mbid_mapping?.recording_mbid;
        const playableSrc = this.getPlayableSrc(info) || '';

        return {
            itemType: ItemType.Media,
            mediaType: playableSrc.startsWith('youtube:') ? MediaType.Video : MediaType.Audio,
            src: `listenbrainz:listen:${this.isNowPlaying ? 'now-playing' : item.listened_at}`,
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
            playedAt: this.isNowPlaying ? -1 : item.listened_at || 0,
            link: {
                src: playableSrc,
                srcs: info?.origin_url?.includes('soundcloud.com') ? [info.origin_url] : undefined,
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
                if (url.includes('soundcloud.com')) {
                    return this.getSoundCloudSrc(url);
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
            if (url.includes('i=')) {
                const id = url.split('i=').pop();
                return `apple:songs:${id}`;
            } else if (url.includes('music-video')) {
                const [id] = new URL(url).pathname.split('/').reverse();
                return `apple:music-videos:${id}`;
            }
        }
    }

    private getSoundCloudSrc(url: string): string | undefined {
        if (url) {
            const trackUrl = new URL(url);
            const [id, type] = trackUrl.pathname.split('/').reverse();
            if (type === 'tracks') {
                return `soundcloud:${type}:${id}`;
            } else {
                return `soundcloud:url:${nanoid()}`;
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
