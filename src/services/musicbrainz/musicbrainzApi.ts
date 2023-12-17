import {RateLimitThreshold} from 'rate-limit-threshold';
import MediaItem from 'types/MediaItem';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import MusicBrainzAlbumPager from './MusicBrainzAlbumPager';
import {Logger} from 'utils';

const logger = new Logger('musicbrainzApi');

export class MusicBrainzApi {
    private readonly host = `https://musicbrainz.org/ws/2`;
    private readonly rateLimiter = new RateLimitThreshold(15, 18);

    async getISRCs({
        recording_mbid,
        release_mbid,
        track_mbid,
    }: MediaItem): Promise<readonly string[]> {
        try {
            if (!recording_mbid && release_mbid && track_mbid) {
                const pager = new MusicBrainzAlbumPager(release_mbid);
                const items = await fetchFirstPage(pager, {timeout: 3000});
                const item = items.find((item) => item.track_mbid === track_mbid);
                recording_mbid = item?.recording_mbid;
            }
            if (!recording_mbid) {
                return [];
            }
            const recording = await this.get<MusicBrainz.Recording>(
                `/recording/${recording_mbid}`,
                {inc: 'isrcs'}
            );
            // TODO: find best `isrc`.
            return recording.isrcs || [];
        } catch (err: any) {
            if (err.status !== 404) {
                logger.error(err);
            }
            return [];
        }
    }

    async getRecordingsByISRC(isrc: string): Promise<readonly MusicBrainz.Recording[]> {
        const response = await this.get<MusicBrainz.isrc.Response>(`/isrc/${isrc}`);
        return response.recordings || [];
    }

    async get<T>(path: string, params: any = {}): Promise<T> {
        await this.rateLimiter.limit();
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        params.fmt = 'json';
        path = `${path}?${new URLSearchParams(params)}`;
        const response = await fetch(`${this.host}/${path}`, {
            method: 'GET',
            headers: {
                'User-Agent': `${__app_name__}/${__app_version__} ( ${__app_contact__} )`,
            },
        });
        if (!response.ok) {
            throw response;
        }
        const data = await response.json();
        return data;
    }
}

const musicbrainzApi = new MusicBrainzApi();

export default musicbrainzApi;
