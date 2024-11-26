import {partition, Logger} from 'utils';
import MediaItem from 'types/MediaItem';
import MediaServiceId from 'types/MediaServiceId';
import {getService} from 'services/mediaServices';
import {createMediaItemFromFile, createMediaItemFromUrl} from 'services/music-metadata';
import {injectAt} from 'services/playlist';
import youtubeApi from 'services/youtube/youtubeApi';
import {error} from 'components/Dialog';

const logger = new Logger('usePlaylistInject');

const inject = {
    items: injectItems,
    files: injectFiles,
    urls: injectUrls,
    appleTracks: injectAppleTracks,
    spotifyTracks: injectSpotifyTracks,
};

export default function usePlaylistInject() {
    return inject;
}

async function injectItems(items: readonly MediaItem[], atIndex: number): Promise<void> {
    if (items.length === 0) {
        throw Error('No music data found.');
    } else {
        return injectAt(items, atIndex);
    }
}

async function injectUrls(urls: readonly string[], atIndex: number): Promise<void> {
    const [youtubeUrls, otherUrls] = partition(urls, (url) => /youtu\.?be/.test(url));
    try {
        const items = await Promise.all([
            Promise.all(youtubeUrls.map((url) => youtubeApi.getVideoInfo(url))),
            Promise.all(otherUrls.map((url) => createMediaItemFromUrl(url))),
        ]);
        await injectItems(items.flat(), atIndex);
    } catch (err: any) {
        logger.error(err);
        await showError(err);
    }
}

async function injectFiles(files: FileList | readonly File[], atIndex: number): Promise<void> {
    try {
        if (files instanceof FileList) {
            files = Array.from(files);
        }
        const items = await Promise.all(files.map((file) => createMediaItemFromFile(file)));
        await injectItems(items, atIndex);
    } catch (err: any) {
        logger.error(err);
        await showError(err);
    }
}

async function injectAppleTracks(
    type: DataTransferItem['type'],
    data: string,
    atIndex: number
): Promise<void> {
    return injectMediaServiceTracks('apple', type, data, atIndex);
}

async function injectSpotifyTracks(
    type: DataTransferItem['type'],
    data: string,
    atIndex: number
): Promise<void> {
    return injectMediaServiceTracks('spotify', type, data, atIndex);
}

async function injectMediaServiceTracks(
    serviceId: MediaServiceId,
    type: DataTransferItem['type'],
    data: string,
    atIndex: number
): Promise<void> {
    const service = getService(serviceId);
    try {
        if (service?.isConnected()) {
            const items = await service.getDroppedItems!(type, data);
            await injectItems(items, atIndex);
        } else {
            await showError(Error(`Not connected to ${service?.name || serviceId}.`));
        }
    } catch (err) {
        logger.error(err);
        const error =
            err instanceof Error
                ? err
                : Error(`Failed to load ${service?.name || serviceId} media items.`);
        await showError(error);
    }
}

async function showError(err: any): Promise<void> {
    const defaultMessage = 'Unsupported drop type.';
    const message = err instanceof TypeError ? defaultMessage : err.message || defaultMessage;
    await error(message);
}
