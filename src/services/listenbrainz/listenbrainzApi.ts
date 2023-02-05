import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';
import {Logger, partition} from 'utils';
import {compareForRating} from './listenbrainz';
import listenbrainzSettings from './listenbrainzSettings';

console.log('module::listenbrainzApi');

const logger = new Logger('listenbrainzApi');

export class ListenBrainzApi {
    private readonly host = `https://api.listenbrainz.org/1`;
    private rateLimitRemainingCalls = 2;
    private rateLimitResetTime = 0;

    async rate(item: MediaItem, score: number): Promise<void> {
        if (item.recording_msid || item.recording_mbid) {
            const path = `feedback/recording-feedback`;
            const params: any = {score};
            if (item.recording_msid) {
                params.recording_msid = item.recording_msid;
            }
            if (item.recording_mbid) {
                params.recording_mbid = item.recording_mbid;
            }
            const response = await this.post(path, params);
            if (!response.ok) {
                throw response;
            }
        }
    }

    async addRatings(items: readonly MediaItem[]): Promise<void> {
        items = items.filter((item) => !!item.recording_msid || !!item.recording_mbid);
        if (items.length > 0) {
            const ratings = await this.getRatings(items);

            mediaObjectChanges.dispatch<MediaItem>(
                items.map((item, index) => ({
                    match: (object: MediaObject) => compareForRating(object, item),
                    values: {rating: ratings[index]},
                }))
            );
        }
    }

    async getRatings(items: readonly MediaItem[]): Promise<readonly number[]> {
        items = items.filter((item) => !!item.recording_msid || !!item.recording_mbid);
        if (items.length > 0) {
            const [mbids, msids] = partition(items, (item) => !!item.recording_mbid);
            const recording_mbids = mbids.map((item) => item.recording_mbid);
            const recording_msids = msids.map((item) => item.recording_msid);
            const params: any = {};
            if (recording_mbids.length > 0) {
                params.recording_mbids = recording_mbids;
            }
            if (recording_msids.length > 0) {
                params.recording_msids = recording_msids;
            }
            const {feedback} = await this.get<ListenBrainz.User.UserRecordingsFeedbackResponse>(
                `feedback/user/${listenbrainzSettings.userId}/get-feedback-for-recordings`,
                params
            );
            return items.map((item) =>
                feedback.find(
                    (feedback) =>
                        (!!item.recording_mbid &&
                            item.recording_mbid === feedback.recording_mbid) ||
                        (!!item.recording_msid && item.recording_msid === feedback.recording_msid)
                )?.score === 1
                    ? 1
                    : 0
            );
        }
        return [];
    }

    async getListeningActivity({
        range = 'all_time',
    }: ListenBrainz.Stats.ListeningActivityParams = {}): Promise<
        readonly ListenBrainz.Stats.ListeningActivity[]
    > {
        const {
            payload: {listening_activity},
        } = await this.get<ListenBrainz.Stats.ListeningActivityResponse>(
            `stats/user/${listenbrainzSettings.userId}/listening-activity`,
            {range}
        );
        return listening_activity;
    }

    async getListenCount(): Promise<number> {
        const {
            payload: {count},
        } = await this.get<ListenBrainz.User.ListenCount>(
            `user/${listenbrainzSettings.userId}/listen-count`
        );
        return count;
    }

    async getListens(params?: ListenBrainz.User.ListensParams): Promise<ListenBrainz.User.Listens> {
        const result = await this.get<ListenBrainz.User.Listens>(
            `user/${listenbrainzSettings.userId}/listens`,
            params
        );
        return result;
    }

    async scrobble(items: Listen[]): Promise<void> {
        if (items.length > 0) {
            logger.log('scrobble', {items});
            await this.post(`submit-listens`, {
                listen_type: items.length === 1 ? 'single' : 'import',
                payload: items.map((item) => ({
                    listened_at: item.playedAt,
                    track_metadata: this.getScrobbleParams(item),
                })),
            });
        }
    }

    async updateNowPlaying(item: MediaItem): Promise<void> {
        logger.log('updateNowPlaying', {item});
        try {
            if (this.canScrobble(item)) {
                await this.post(`submit-listens`, {
                    listen_type: 'playing_now',
                    payload: [
                        {
                            track_metadata: this.getScrobbleParams(item),
                        },
                    ],
                });
            }
        } catch (err) {
            logger.log('Failed to update "now playing":', {item});
            logger.error(err);
        }
    }

    async get<T>(path: string, params?: any, signed?: boolean): Promise<T> {
        if (params) {
            path = `${path}?${new URLSearchParams(params)}`;
        }
        const response = await this.fetch(path, {method: 'GET'}, signed);
        if (!response.ok || response.status === 204) {
            throw response;
        }
        return response.json();
    }

    async post(path: string, params: any): Promise<Response> {
        const headers = {'Content-Type': 'application/json'};
        const body = JSON.stringify(params);
        return this.fetch(path, {method: 'POST', headers, body}, true);
    }

    private async fetch(path: string, init: RequestInit, signed = false): Promise<Response> {
        await this.applyRateLimiting();

        if (signed) {
            init.headers = {
                ...init.headers,
                Authorization: `Token ${listenbrainzSettings.token}`,
            };
        }

        if (path.startsWith('/')) {
            path = path.slice(1);
        }

        const response = await window.fetch(`${this.host}/${path}`, init);

        if (!response.ok) {
            throw response;
        }

        const headers = response.headers;
        if (headers.has('x-ratelimit-remaining')) {
            this.rateLimitRemainingCalls = Number(headers.get('x-ratelimit-remaining')) || 1;
        }
        if (headers.has('x-ratelimit-reset-in')) {
            this.rateLimitResetTime =
                Date.now() + (Number(headers.get('x-ratelimit-reset-in')) || 1) * 1000;
        }

        if (this.rateLimitRemainingCalls < 5) {
            logger.log({
                rateLimitRemainingCalls: this.rateLimitRemainingCalls,
                rateLimitReset: new Date(this.rateLimitResetTime).toISOString(),
            });
        }

        return response;
    }

    private getScrobbleParams(item: MediaItem): ListenBrainz.ListenMetadata {
        const info: ListenBrainz.ListenMetadata['additional_info'] = {
            media_player: __app_name__,
            media_player_version: __app_version__,
            submission_client: __app_name__,
        };
        if (item.duration) {
            info.duration = Math.round(item.duration);
        }
        if (item.track) {
            info.tracknumber = item.track;
        }
        if (item.artist_mbids) {
            info.artist_mbids = item.artist_mbids;
        }
        if (item.release_mbid) {
            info.release_mbid = item.release_mbid;
        }
        if (item.recording_mbid) {
            info.recording_mbid = item.recording_mbid;
        }
        if (item.isrc) {
            info.isrc = item.isrc;
        }
        if (item.externalUrl) {
            info.origin_url = item.externalUrl;
        }
        const [service] = item.src.split(':');
        switch (service) {
            case 'spotify':
                if (item.externalUrl) {
                    info.spotify_id = item.externalUrl;
                }
                info.music_service = 'spotify.com';
                break;

            case 'apple':
                info.music_service = 'music.apple.com';
                break;

            case 'youtube':
                info.music_service = 'youtube.com';
                break;

            case 'jellyfin':
                info.music_service_name = 'Jellyfin';
                break;

            case 'plex':
                info.music_service_name = 'Plex';
                break;

            case 'blob':
            case 'file':
                info.music_service_name = 'Local file';
                break;
        }
        const params: ListenBrainz.ListenMetadata = {
            track_name: item.title,
            artist_name: item.artists![0],
            additional_info: info,
        };
        if (item.album && item.album !== '[Unknown Album]') {
            params.release_name = item.album;
        }
        return params;
    }

    private canScrobble(item: MediaItem | null): boolean {
        return !!item && !!item.title && !!item.artists?.[0] && item.duration > 30;
    }

    private applyRateLimiting(): Promise<void> {
        return new Promise((resolve) => {
            if (this.rateLimitRemainingCalls) {
                this.rateLimitRemainingCalls--;
                resolve();
            } else {
                const time = this.rateLimitResetTime - Date.now();
                if (time > 0) {
                    setTimeout(resolve, time);
                } else {
                    resolve();
                }
            }
        });
    }
}

const listenbrainzApi = new ListenBrainzApi();

export default listenbrainzApi;
