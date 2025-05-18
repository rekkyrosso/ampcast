import CreatePlaylistOptions from 'types/CreatePlaylistOptions';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {dispatchMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import {getService} from 'services/mediaServices';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import {Logger, partition} from 'utils';
import listenbrainzSettings from './listenbrainzSettings';

const logger = new Logger('listenbrainzApi');

export class ListenBrainzApi {
    private readonly apiHost = 'https://api.listenbrainz.org/1';
    private readonly webHost = 'https://musicbrainz.org';
    private rateLimitRemainingCalls = 2;
    private rateLimitResetTime = 0;

    canScrobble(item: MediaItem | null): boolean {
        return (
            !!item &&
            !!item.title &&
            !!item.artists?.[0] &&
            (!item.linearType || item.linearType === LinearType.MusicTrack) &&
            (item.duration > 30 || !item.duration)
        );
    }

    async store(item: MediaItem, inLibrary: boolean): Promise<void> {
        if (item.recording_msid || item.recording_mbid) {
            const path = `feedback/recording-feedback`;
            const params: any = {score: inLibrary ? 1 : 0};
            if (item.recording_msid) {
                params.recording_msid = item.recording_msid;
            }
            if (item.recording_mbid) {
                params.recording_mbid = item.recording_mbid;
            }
            await this.post(path, params);
        }
    }

    async addUserData(items: readonly MediaItem[]): Promise<void> {
        items = items.filter((item) => !!item.recording_msid || !!item.recording_mbid);
        if (items.length > 0) {
            const inLibrary = await this.getInLibrary(items);

            dispatchMediaObjectChanges(
                items.map((item, index) => ({
                    match: (object: MediaObject) => this.compareForRating(object, item),
                    values: {inLibrary: inLibrary[index]},
                }))
            );
        }
    }

    async addToPlaylist<T extends MediaItem>(
        playlist: MediaPlaylist,
        items: readonly T[]
    ): Promise<void> {
        items = await musicbrainzApi.addMetadata(items);
        items = items.filter((item) => item.recording_mbid);
        const [, , playlist_mbid] = playlist.src.split(':');
        return this.post(`playlist/${playlist_mbid}/item/add`, {
            playlist: {
                track: items.map((item) => this.createTrack(item)),
            },
        });
    }

    compareForRating<T extends MediaObject>(a: T, b: T): boolean {
        const [aService] = a.src.split(':');
        const [bService] = b.src.split(':');

        if (aService !== bService) {
            return false;
        }

        switch (a.itemType) {
            case ItemType.Media:
                return (
                    a.itemType === b.itemType &&
                    ((!!a.recording_mbid && a.recording_mbid === b.recording_mbid) ||
                        (!!a.recording_msid && a.recording_msid === b.recording_msid))
                );

            default:
                return false;
        }
    }

    async createPlaylist<T extends MediaItem>(
        name: string,
        {description = '', isPublic, items = []}: CreatePlaylistOptions<T> = {}
    ): Promise<{playlist_mbid: string}> {
        const userId = listenbrainzSettings.userId;
        items = await musicbrainzApi.addMetadata(items);
        items = items.filter((item) => item.recording_mbid);
        return this.post('playlist/create', {
            playlist: {
                extension: {
                    'https://musicbrainz.org/doc/jspf#playlist': {
                        creator: userId,
                        public: isPublic,
                    },
                },
                creator: userId,
                title: name,
                annotation: description,
                track: items.map((item) => this.createTrack(item)),
            },
        });
    }

    createTrack(item: MediaItem) {
        const host = this.webHost;
        const recording_mbid = item.recording_mbid;
        const release_mbid = item.release_mbid || '';
        return {
            title: item.title,
            id: recording_mbid,
            identifier: recording_mbid ? `${host}/recording/${recording_mbid}` : '',
            creator: item.artists?.join(' & '),
            trackNum: item.track,
            duration: item.duration,
            extension: {
                'https://musicbrainz.org/doc/jspf#track': {
                    artist_identifiers:
                        item.artist_mbids?.map((artist_mbid) => `${host}/artist/${artist_mbid}`) ||
                        [],
                    release_identifier: release_mbid ? `${host}/release/${release_mbid}` : '',
                },
            },
            album: item.album || '',
        };
    }

    async getInLibrary(items: readonly MediaItem[]): Promise<readonly boolean[]> {
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
            const {feedback} = await this.post<ListenBrainz.User.UserRecordingsFeedbackResponse>(
                `feedback/user/${listenbrainzSettings.userId}/get-feedback-for-recordings`,
                params
            );
            return items.map(
                (item) =>
                    feedback.find(
                        (feedback) =>
                            (!!item.recording_mbid &&
                                item.recording_mbid === feedback.recording_mbid) ||
                            (!!item.recording_msid &&
                                item.recording_msid === feedback.recording_msid)
                    )?.score === 1
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
            logger.log(
                'scrobble',
                items.map((item) => item.src)
            );
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
                logger.log('updateNowPlaying', item.src);
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
            logger.log('Failed to update "Now playing":', item?.src);
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

    async post<T>(path: string, params: any): Promise<T> {
        const headers = {'Content-Type': 'application/json'};
        const body = JSON.stringify(params);
        const response = await this.fetch(path, {method: 'POST', headers, body}, true);
        return response.json();
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

        const response = await window.fetch(`${this.apiHost}/${path}`, init);

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
        type Mutable<T> = {-readonly [P in keyof T]: T[P]};
        const info: Mutable<ListenBrainz.ListenMetadata['additional_info']> = {
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

        // From ListenBrainz API Docs:
        //
        // > Only if you cannot determine a domain for the service should you use
        // > the text-only `music_service_name` field.

        const [serviceId] = item.src.split(':');
        switch (serviceId) {
            case 'soundcloud':
                if (item.externalUrl) {
                    info.origin_url = item.externalUrl;
                }
                info.music_service = 'soundcloud.com';
                break;

            case 'spotify':
                if (item.externalUrl) {
                    info.origin_url = item.externalUrl;
                    info.spotify_id = item.externalUrl;
                }
                info.music_service = 'spotify.com';
                break;

            case 'apple':
                if (item.externalUrl) {
                    info.origin_url = item.externalUrl;
                }
                info.music_service = 'music.apple.com';
                break;

            case 'youtube':
                if (item.externalUrl) {
                    info.origin_url = item.externalUrl;
                }
                info.music_service = 'youtube.com';
                break;

            case 'tidal':
                info.music_service = 'tidal.com';
                break;

            case 'blob':
            case 'file':
                info.music_service_name = 'Local file';
                break;

            default: {
                const service = getService(serviceId);
                if (service) {
                    info.music_service_name = service.name;
                }
            }
        }
        const params: Mutable<ListenBrainz.ListenMetadata> = {
            track_name: item.title,
            artist_name: item.artists![0],
            additional_info: info,
        };
        if (item.album && item.album !== '[Unknown Album]') {
            params.release_name = item.album;
        }
        return params;
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
