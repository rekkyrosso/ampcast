import md5 from 'md5';
import unidecode from 'unidecode';
import ItemType from 'types/ItemType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import Thumbnail from 'types/Thumbnail';
import {Logger, exists} from 'utils';
import lastfmSettings from './lastfmSettings';

const logger = new Logger('lastfmApi');

export class LastFmApi {
    private readonly host = `https://ws.audioscrobbler.com/2.0`;
    private readonly placeholderImage = '2a96cbd8b46e442fc41c2b86b821562f.png';

    async getSignature(params: Record<string, string>): Promise<string> {
        const keys = Object.keys(params);
        let string = '';

        keys.sort();
        keys.forEach((key) => (string += key + params[key]));

        const secret = await lastfmSettings.getSecret();

        string += secret;

        return md5(string);
    }

    async scrobble(items: Listen[]): Promise<void> {
        if (items.length > 0) {
            logger.log(
                'scrobble',
                items.map((item) => item.src)
            );
            const method = 'track.scrobble';
            if (items.length === 1) {
                const item = items[0];
                const timestamp = String(item.playedAt);
                await this.post({
                    method,
                    timestamp,
                    ...this.getScrobbleParams(item),
                });
            } else {
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
    }

    async updateNowPlaying(item: MediaItem): Promise<void> {
        try {
            if (this.canScrobble(item)) {
                logger.log('updateNowPlaying', item.src);
                await this.post({
                    method: 'track.updateNowPlaying',
                    ...this.getScrobbleParams(item),
                });
            }
        } catch (err) {
            logger.log('Failed to update "now playing":', item?.src);
            logger.error(err);
        }
    }

    async getThumbnails(item: MediaObject, signal?: AbortSignal): Promise<Thumbnail[] | undefined> {
        const api_key = lastfmSettings.apiKey;
        if (
            !api_key ||
            !item ||
            (item.itemType !== ItemType.Album && item.itemType !== ItemType.Media)
        ) {
            return undefined;
        }
        let album: string | undefined;
        let artist: string | undefined;
        if (item.itemType === ItemType.Album) {
            album = item.title;
            artist = item.artist;
        } else {
            album = item.album;
            artist = item.albumArtist || item.artists?.[0];
        }
        if (!album || !artist) {
            return undefined;
        }
        const {
            results: {
                albummatches: {album: albums = []},
            },
        } = await this.get<LastFm.AlbumSearch>({method: 'album.search', album}, signal);
        const decode = (name: string) => unidecode(name).toLowerCase();
        const decodedAlbum = decode(album);
        const decodedArtist = decode(artist);
        return albums
            .filter(
                (album) =>
                    decode(album.name) === decodedAlbum &&
                    decode(String(album.artist)) === decodedArtist
            )
            .map((album) => this.createThumbnails(album.image))
            .filter(exists)[0];
    }

    async getUserInfo(): Promise<LastFm.UserInfo> {
        return this.get({
            method: 'user.getInfo',
            user: lastfmSettings.userId,
        });
    }

    createThumbnails(thumbs: readonly LastFm.Thumbnail[]): Thumbnail[] | undefined {
        const result = thumbs
            ? [this.createThumbnail(thumbs[2], 174), this.createThumbnail(thumbs[3], 300)].filter(
                  exists
              )
            : [];

        return result.length === 0 ? undefined : result;
    }

    async get<T>(params: any, signal?: AbortSignal): Promise<T> {
        const path = `${this.host}?${new URLSearchParams({
            ...params,
            api_key: lastfmSettings.apiKey,
            format: 'json',
        })}`;
        const response = await fetch(path, {method: 'GET', signal});
        if (!response.ok) {
            throw response;
        }
        return response.json();
    }

    async post(params: Record<string, string>): Promise<Response> {
        const token = lastfmSettings.token;
        const sk = lastfmSettings.sessionKey;
        const api_key = lastfmSettings.apiKey;
        params = {...params, api_key, token, sk};
        const headers = {'Content-Type': 'application/x-www-form-urlencoded'};
        const api_sig = await this.getSignature(params);
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
        if (item.track_mbid) {
            params.mbid = item.track_mbid;
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
