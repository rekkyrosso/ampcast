import md5 from 'md5';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaType from 'types/MediaType';
import Thumbnail from 'types/Thumbnail';
import {Logger, exists} from 'utils';
import {AddMetadataOptions, bestOf, isSameTrack} from 'services/metadata';
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

    canScrobble(item: MediaItem | null): boolean {
        return (
            !!item &&
            !!item.title &&
            !!item.artists?.[0] &&
            (!item.linearType || item.linearType === LinearType.MusicTrack) &&
            (item.duration > 30 || !item.duration)
        );
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
            logger.log('Failed to update "Now playing":', item?.src);
            logger.error(err);
        }
    }

    async addMetadata<T extends MediaItem>(
        item: T,
        {overWrite, strictMatch}: AddMetadataOptions = {},
        signal?: AbortSignal
    ): Promise<T> {
        try {
            const {title, artists: [artist] = []} = item;
            const trackInfo = await this.getTrackInfo(title, artist, '', signal);
            if (trackInfo) {
                const track = this.createMediaItem(trackInfo);
                if (isSameTrack(item, track, strictMatch)) {
                    if (overWrite) {
                        // Prefer this metadata.
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const {src, externalUrl, playedAt, ...values} = track;
                        return bestOf(values as T, item);
                    } else {
                        return bestOf(item, track as Partial<T>);
                    }
                }
            }
        } catch (err) {
            logger.error(err);
        }
        return item;
    }

    async getThumbnails(
        item: MediaObject,
        signal?: AbortSignal
    ): Promise<readonly Thumbnail[] | undefined> {
        const api_key = lastfmSettings.apiKey;
        if (
            !api_key ||
            !item ||
            (item.itemType !== ItemType.Album && item.itemType !== ItemType.Media)
        ) {
            return undefined;
        }
        let thumbnails: readonly Thumbnail[] | undefined;
        let album: string | undefined;
        let artist: string | undefined;
        if (item.itemType === ItemType.Album) {
            album = item.title;
            artist = item.artist;
        } else {
            album = item.album;
            artist = item.albumArtist || item.artists?.[0];
        }
        if (album && artist) {
            const albumInfo = await this.getAlbumInfo(album, artist, undefined, signal);
            thumbnails = this.createThumbnails(albumInfo?.image);
        }
        if (!thumbnails && item.itemType === ItemType.Media) {
            const trackInfo = await this.getTrackInfo(item.title, artist, '', signal);
            thumbnails =
                this.createThumbnails(trackInfo?.image) ||
                this.createThumbnails(trackInfo?.album?.image);
        }
        return thumbnails;
    }

    async getAlbumInfo(
        title: string,
        artist: string | undefined,
        user?: string,
        signal?: AbortSignal
    ): Promise<LastFm.AlbumInfo | undefined> {
        try {
            if (artist) {
                const params: Record<string, string> = {
                    method: 'album.getInfo',
                    artist: artist,
                    album: title,
                };
                if (user) {
                    params.user = user;
                } else {
                    params.autocorrect = '1';
                }
                const {album} = await lastfmApi.get<LastFm.AlbumInfoResponse>(params, signal);
                if (album) {
                    if ('error' in album) {
                        throw Error((album.error as any)?.message || 'Not found');
                    }
                    return album;
                }
            }
        } catch (err) {
            if (err !== 'Cancelled') {
                logger.info('Album not found', {artist, title});
                logger.error(err);
            }
        }
    }

    async getTrackInfo(
        title: string,
        artist: string | undefined,
        user?: string,
        signal?: AbortSignal
    ): Promise<LastFm.TrackInfo | undefined> {
        try {
            if (artist) {
                const params: Record<string, string> = {
                    method: 'track.getInfo',
                    artist: artist,
                    track: title,
                };
                if (user) {
                    params.user = user;
                } else {
                    params.autocorrect = '1';
                }
                const {track} = await lastfmApi.get<LastFm.TrackInfoResponse>(params, signal);
                if (track) {
                    if ('error' in track) {
                        throw Error((track.error as any)?.message || 'Not found');
                    }
                    return track;
                }
            }
        } catch (err) {
            if (err !== 'Cancelled') {
                logger.info('Track not found', {artist, title});
                logger.error(err);
            }
        }
    }

    async getUserInfo(): Promise<LastFm.UserInfo> {
        return this.get({
            method: 'user.getInfo',
            user: lastfmSettings.userId,
        });
    }

    createThumbnails(thumbs?: readonly LastFm.Thumbnail[]): Thumbnail[] | undefined {
        const thumbnails = thumbs
            ? [this.createThumbnail(thumbs[2], 174), this.createThumbnail(thumbs[3], 300)].filter(
                  exists
              )
            : [];

        return thumbnails.length === 0 ? undefined : thumbnails;
    }

    async search(query: string): Promise<readonly MediaItem[]> {
        const {
            results: {trackmatches: {track: tracks = []} = {}},
        } = await this.get<LastFm.TrackSearch>({
            method: 'track.search',
            track: query,
            limit: 20,
        });
        return tracks.map((track) => ({
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `lastfm:track:${nanoid()}`,
            title: track.name,
            artists: track?.artist ? [track.artist] : undefined,
            duration: 0,
            playedAt: 0,
            thumbnails: this.createThumbnails(track.image),
        }));
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

    private createMediaItem(track: LastFm.TrackInfo): MediaItem {
        const {album, artist} = track;
        return {
            itemType: ItemType.Media,
            mediaType: MediaType.Audio,
            src: `lastfm:track:${nanoid()}`,
            title: track.name,
            artists: artist?.name ? [artist.name] : undefined,
            album: album?.title || undefined,
            albumArtist: album?.artist || undefined,
            artist_mbids: artist?.mbid ? [artist.mbid] : undefined,
            release_mbid: album?.mbid || undefined,
            recording_mbid: track.mbid || undefined,
            duration: Number(track.duration) / 1000 || 0,
            playedAt: 0,
            thumbnails: this.createThumbnails(track.image || album?.image),
        };
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
