import {filter, mergeMap, withLatestFrom} from 'rxjs/operators';
import MediaItem from 'types/MediaItem';
import PlaybackState from 'types/PlaybackState';
import {observePlaybackEnd, observePlaybackStart} from 'services/mediaPlayback';
import {lf_api_key} from 'services/credentials';
import Logger from 'utils/Logger';
import {getApiSignature, observeAccessToken, observeSessionKey} from './lastfmAuth';

console.log('module::lastfmScrobbler');

const logger = new Logger('lastfmScrobbler');

const lastfmApi = `https://ws.audioscrobbler.com/2.0`;

const isReportable = ({currentItem}: PlaybackState): boolean =>
    !!currentItem?.title && !!currentItem?.artist && currentItem?.duration > 30;

observePlaybackStart()
    .pipe(
        filter(isReportable),
        withLatestFrom(observeAccessToken(), observeSessionKey()),
        filter(([, token, sessionKey]) => !!token && !!sessionKey),
        mergeMap(([{currentItem}, token, sessionKey]) =>
            updateNowPlaying(currentItem!, token, sessionKey)
        )
    )
    .subscribe(logger);

observePlaybackEnd()
    .pipe(
        filter(isReportable),
        withLatestFrom(observeAccessToken(), observeSessionKey()),
        filter(([, token, sessionKey]) => !!token && !!sessionKey),
        mergeMap(([{currentItem, startedAt}, token, sessionKey]) =>
            scrobble(currentItem!, token, sessionKey, startedAt)
        )
    )
    .subscribe(logger);

async function updateNowPlaying(item: MediaItem, token: string, sk: string): Promise<void> {
    const method = 'track.updateNowPlaying';
    const params = {api_key: lf_api_key, token, sk, method, ...getParamsFromMediaItem(item)};
    const api_sig = getApiSignature(params);
    await fetch(lastfmApi, {
        method: 'POST',
        body: `${new URLSearchParams(params)}&api_sig=${api_sig}`,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });
}

async function scrobble(
    item: MediaItem,
    token: string,
    sk: string,
    startedAt: number
): Promise<void> {
    startedAt = Math.floor(startedAt / 1000);
    const endedAt = Math.floor(Date.now() / 1000);
    const playTime = endedAt - startedAt;
    const minTime = 4 * 60;
    if (playTime > minTime || playTime > item.duration / 2) {
        const method = 'track.scrobble';
        const timestamp = String(startedAt);
        const params = {
            api_key: lf_api_key,
            token,
            sk,
            method,
            timestamp,
            ...getParamsFromMediaItem(item),
        };
        const api_sig = getApiSignature(params);
        await fetch(lastfmApi, {
            method: 'POST',
            body: `${new URLSearchParams(params)}&api_sig=${api_sig}`,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
    }
}

function getParamsFromMediaItem(item: MediaItem): Record<string, string> {
    const params: Record<string, string> = {};
    params.track = item.title;
    params.artist = item.artist!;
    if (item.album) {
        params.album = item.album;
    }
    if (item.albumArtist) {
        params.albumArtist = item.albumArtist;
    }
    if (item.duration) {
        params.duration = String(Math.round(item.duration));
    }
    if (item.track) {
        params.trackNumber = String(item.track);
    }
    if (item.mbid) {
        params.mbid = item.mbid;
    }
    return params;
}
