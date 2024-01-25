import getYouTubeID from 'get-youtube-id';
import {getService} from 'services/mediaServices';
import {createMediaItemFromFile, createMediaItemFromUrl} from 'services/music-metadata';
import {injectAt} from 'services/playlist';
import {getYouTubeVideoInfo} from 'services/youtube';
import {error} from 'components/Dialog';
import {partition, Logger} from 'utils';

const logger = new Logger('usePlaylistInject');

const inject = {
    items: injectAt,
    files: injectFiles,
    urls: injectUrls,
    spotifyTracks: injectSpotifyTracks,
};

export default function usePlaylistInject() {
    return inject;
}

async function injectUrls(urls: readonly string[], atIndex: number): Promise<void> {
    const [youtubeUrls, otherUrls] = partition(urls, (url) => !!getYouTubeID(url));
    const youtubeIds = youtubeUrls.map((url) => getYouTubeID(url)!);
    try {
        const items = await Promise.all([
            Promise.all(youtubeIds.map((id) => getYouTubeVideoInfo(id))),
            Promise.all(otherUrls.map((url) => createMediaItemFromUrl(url))),
        ]);
        await injectAt(items.flat(), atIndex);
    } catch (err: any) {
        await showError(err);
    }
}

async function injectFiles(files: FileList | readonly File[], atIndex: number): Promise<void> {
    try {
        if (files instanceof FileList) {
            files = Array.from(files);
        }
        const items = await Promise.all(files.map((file) => createMediaItemFromFile(file)));
        await injectAt(items, atIndex);
    } catch (err: any) {
        await showError(err);
    }
}

async function injectSpotifyTracks(trackIds: readonly string[], atIndex: number): Promise<void> {
    try {
        const spotify = getService('spotify');
        if (spotify?.isConnected()) {
            const items = await spotify.getTracksById!(trackIds);
            await injectAt(items, atIndex);
        } else {
            await showError(Error('Not connected to Spotify.'));
        }
    } catch (err: any) {
        await showError(Error('Failed to load Spotify tracks.'));
    }
}

async function showError(err: any): Promise<void> {
    logger.error(err);
    const defaultMessage = 'Media could not be loaded.';
    const message = err instanceof TypeError ? defaultMessage : err.message || defaultMessage;
    await error(message);
}
