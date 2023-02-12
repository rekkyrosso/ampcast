import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import Thumbnail from 'types/Thumbnail';
import {lf_api_key} from 'services/credentials';
import {Logger, exists} from 'utils';
import {getApiSignature} from './lastfmAuth';
import lastfmSettings from './lastfmSettings';

console.log('module::lastfmApi');

const logger = new Logger('lastfmApi');

export class LastFmApi {
    private readonly host = `https://ws.audioscrobbler.com/2.0`;
    private readonly placeholderImage = '2a96cbd8b46e442fc41c2b86b821562f.png';

    async scrobble(items: Listen[]): Promise<void> {
        logger.log('scrobble', {items});
        const method = 'track.scrobble';
        if (items.length === 1) {
            const item = items[0];
            const timestamp = String(item.playedAt);
            await this.post({
                method,
                timestamp,
                ...this.getScrobbleParams(item),
            });
        } else if (items.length > 0) {
            const body: Record<string, string> = {};
            items.forEach((item, index) => {
                const params = this.getScrobbleParams(item);
                body[`timestamp[${index}]`] = String(item.playedAt);
                Object.keys(params).forEach((key) => {
                    body[`${key}[${index}]`] = params[key];
                });
            });
            await this.post({method, ...body});
        }
    }

    async updateNowPlaying(item: MediaItem): Promise<void> {
        logger.log('updateNowPlaying', {item});
        try {
            if (this.canScrobble(item)) {
                await this.post({
                    method: 'track.updateNowPlaying',
                    ...this.getScrobbleParams(item),
                });
            }
        } catch (err) {
            logger.log('Failed to update "now playing":', {item});
            logger.error(err);
        }
    }

    async getUserInfo(): Promise<LastFm.UserInfo> {
        return this.get({
            method: 'user.getInfo',
            user: lastfmSettings.userId,
        });
    }

    createThumbnails(thumbs: readonly LastFm.Thumbnail[]): Thumbnail[] | undefined {
        const result = thumbs
            ? [
                  this.createThumbnail(thumbs[0], 34),
                  this.createThumbnail(thumbs[1], 64),
                  this.createThumbnail(thumbs[2], 174),
                  this.createThumbnail(thumbs[3], 300),
              ].filter(exists)
            : [];

        return result.length === 0 ? undefined : result;
    }

    async get<T>(params: any): Promise<T> {
        const path = `${this.host}?${new URLSearchParams({
            ...params,
            api_key: lf_api_key,
            format: 'json',
        })}`;
        const response = await fetch(path, {method: 'GET'});
        if (!response.ok) {
            throw response;
        }
        return response.json();
    }

    async post(params: Record<string, string>): Promise<Response> {
        const token = lastfmSettings.token;
        const sk = lastfmSettings.sessionKey;
        params = {...params, api_key: lf_api_key, token, sk};
        const headers = {'Content-Type': 'application/x-www-form-urlencoded'};
        const api_sig = getApiSignature(params);
        const body = `${new URLSearchParams(params)}&api_sig=${api_sig}`;
        const response = await fetch(this.host, {method: 'POST', headers, body});
        if (!response.ok) {
            throw response;
        }
        return response;
    }

    private getScrobbleParams(item: MediaItem): Record<string, string> {
        const params: Record<string, string> = {};
        params.track = item.title;
        params.artist = item.artists![0];
        if (item.album && item.album !== '[Unknown Album]') {
            params.album = item.album;
            if (item.albumArtist) {
                params.albumArtist = item.albumArtist;
            }
        }
        if (item.duration) {
            params.duration = String(Math.round(item.duration));
        }
        if (item.track) {
            params.trackNumber = String(item.track);
        }
        if (item.recording_mbid) {
            params.mbid = item.recording_mbid;
        }
        return params;
    }

    private canScrobble(item: MediaItem | null): boolean {
        return !!item && !!item.title && !!item.artists?.[0] && item.duration > 30;
    }

    private createThumbnail(
        thumb: LastFm.Thumbnail,
        width: number,
        height = width
    ): Thumbnail | undefined {
        if (thumb) {
            const url = thumb['#text'] as string;
            if (url && !url.endsWith(this.placeholderImage)) {
                return {url, width, height};
            }
        }
    }
}

const lastfmApi = new LastFmApi();

export default lastfmApi;
