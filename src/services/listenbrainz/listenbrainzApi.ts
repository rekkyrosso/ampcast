import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import listenbrainzSettings from './listenbrainzSettings';

console.log('module::listenbrainzApi');

const logger = new Logger('listenbrainzApi');

export class ListenBrainzApi {
    private readonly host = `https://api.listenbrainz.org/1`;
    private rateLimitRemainingCalls = 2;
    private rateLimitResetTime = 0;

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
        logger.log('getListens', {params});
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

        logger.log({
            rateLimitRemaining: this.rateLimitRemainingCalls,
            rateLimitReset: new Date(this.rateLimitResetTime).toISOString(),
        });

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
        if (item.recording_mbid) {
            info.recording_mbid = item.recording_mbid;
        }
        if (item.isrc) {
            info.isrc = item.isrc;
        }
        if (item.externalUrl) {
            info.origin_url = item.externalUrl;
        }
        const [source] = item.src.split(':');
        switch (source) {
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
            artist_name: item.artist!,
            additional_info: info,
        };
        if (item.album) {
            params.release_name = item.album;
        }
        return params;
    }

    private canScrobble(item: MediaItem | null): boolean {
        return !!item && !!item.title && !!item.artist && item.duration > 30;
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
