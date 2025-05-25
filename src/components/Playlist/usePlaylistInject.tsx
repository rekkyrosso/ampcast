import React from 'react';
import MediaItem from 'types/MediaItem';
import MediaServiceId from 'types/MediaServiceId';
import {exists, Logger, uniq} from 'utils';
import {getService} from 'services/mediaServices';
import {createMediaItemFromFile, createMediaItemFromUrl} from 'services/metadata';
import {injectAt} from 'services/playlist';
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
    try {
        const maxUrls = 10;
        urls = uniq(urls).slice(0, maxUrls);
        const errors: {url: string; error: unknown}[] = [];
        const result = await Promise.all(
            urls.map(async (url) => {
                try {
                    const hostname = new URL(url).hostname;
                    if (hostname === 'music.apple.com') {
                        const items = await getMediaServiceTracks('apple', 'text/uri-list', url);
                        return items;
                    } else if (hostname === 'open.spotify.com') {
                        const items = await getMediaServiceTracks('spotify', 'text/uri-list', url);
                        return items;
                    } else {
                        const item = await createMediaItemFromUrl(url);
                        return item;
                    }
                } catch (error) {
                    errors.push({url, error});
                }
            })
        );
        const items = result.filter(exists).flat();
        if (items.length > 0) {
            await injectItems(items, atIndex);
        }
        if (errors.length > 0) {
            if (errors.length === 1 && urls.length === 1) {
                throw errors[0].error;
            } else {
                await error({
                    message: (
                        <>
                            <p>Some files could not be loaded:</p>
                            <ul
                                style={{
                                    marginTop: '1em',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875em',
                                }}
                            >
                                {errors.map(({url}) => (
                                    <li key={url}>{url}</li>
                                ))}
                            </ul>
                        </>
                    ),
                });
            }
        }
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
        const items = await getMediaServiceTracks(serviceId, type, data);
        await injectItems(items, atIndex);
    } catch (err) {
        logger.error(err);
        const error =
            err instanceof Error
                ? err
                : Error(`Failed to load ${service?.name || serviceId} media items.`);
        await showError(error);
    }
}

async function getMediaServiceTracks(
    serviceId: MediaServiceId,
    type: DataTransferItem['type'],
    data: string
): Promise<readonly MediaItem[]> {
    const service = getService(serviceId);
    if (service?.isConnected()) {
        return service.getDroppedItems!(type, data);
    } else {
        throw Error(`Not connected to ${service?.name || serviceId}.`);
    }
}

async function showError(err: any): Promise<void> {
    const defaultMessage = 'Could not load media.';
    const message = err instanceof TypeError ? defaultMessage : err.message || defaultMessage;
    await error(message);
}
