import React, {useCallback, useMemo} from 'react';
import MediaItem from 'types/MediaItem';
import MediaServiceId from 'types/MediaServiceId';
import {exists, Logger, uniq} from 'utils';
import {getService} from 'services/mediaServices';
import {createMediaItemFromFile, createMediaItemFromUrl} from 'services/metadata';
import {error} from 'components/Dialog';
import {PlayableType} from 'types/Playlist';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaPlaylist from 'types/MediaPlaylist';
import fetchAllTracks from 'services/pagers/fetchAllTracks';

const logger = new Logger('usePlaylistInject');

interface Injector {
    readonly items: (items: readonly MediaItem[], atIndex: number) => Promise<void>;
    readonly files: (files: FileList | readonly File[], atIndex: number) => Promise<void>;
    readonly urls: (urls: readonly string[], atIndex: number) => Promise<void>;
    readonly appleTracks: (
        type: DataTransferItem['type'],
        data: string,
        atIndex: number
    ) => Promise<void>;
    readonly spotifyTracks: (
        type: DataTransferItem['type'],
        data: string,
        atIndex: number
    ) => Promise<void>;
    readonly onDrop: (
        data:
            | readonly MediaItem[]
            | readonly MediaAlbum[]
            | readonly MediaPlaylist[]
            | readonly File[]
            | DataTransferItem,
        atIndex: number
    ) => Promise<void>;
}

export default function usePlaylistInject(
    injectAt: (items: readonly MediaItem[], atIndex: number) => Promise<void>
): Injector {
    const injectItems = useCallback(
        async (objects: PlayableType, atIndex: number) => {
            const items = await createMediaItems(objects);
            if (items.length === 0) {
                throw Error('No music data found.');
            } else {
                return injectAt(items, atIndex);
            }
        },
        [injectAt]
    );

    const injectFiles = useCallback(
        async (files: FileList | readonly File[], atIndex: number) => {
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
        },
        [injectItems]
    );

    const injectUrls = useCallback(
        async (urls: readonly string[], atIndex: number) => {
            try {
                const maxUrls = 10;
                urls = uniq(urls).slice(0, maxUrls);
                const errors: {url: string; error: unknown}[] = [];
                const result = await Promise.all(
                    urls.map(async (url) => {
                        try {
                            const hostname = new URL(url).hostname;
                            if (hostname === 'music.apple.com') {
                                const items = await getMediaServiceTracks(
                                    'apple',
                                    'text/uri-list',
                                    url
                                );
                                return items;
                            } else if (hostname === 'open.spotify.com') {
                                const items = await getMediaServiceTracks(
                                    'spotify',
                                    'text/uri-list',
                                    url
                                );
                                return items;
                            } else {
                                const item = await createMediaItemFromUrl(url, true);
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
        },
        [injectItems]
    );

    const injectMediaServiceTracks = useCallback(
        async (
            serviceId: MediaServiceId,
            type: DataTransferItem['type'],
            data: string,
            atIndex: number
        ) => {
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
        },
        [injectItems]
    );

    const injectAppleTracks = useCallback(
        async (type: DataTransferItem['type'], data: string, atIndex: number) => {
            return injectMediaServiceTracks('apple', type, data, atIndex);
        },
        [injectMediaServiceTracks]
    );

    const injectSpotifyTracks = useCallback(
        async (type: DataTransferItem['type'], data: string, atIndex: number) => {
            return injectMediaServiceTracks('spotify', type, data, atIndex);
        },
        [injectMediaServiceTracks]
    );

    const onDrop = useCallback(
        async (
            data:
                | readonly MediaItem[]
                | readonly MediaAlbum[]
                | readonly MediaPlaylist[]
                | readonly File[]
                | DataTransferItem,
            atIndex: number
        ) => {
            if (data instanceof DataTransferItem) {
                const type = data.type;
                switch (type) {
                    case 'text/x-spotify-tracks': {
                        data.getAsString(async (string) => {
                            await injectSpotifyTracks(type, string, atIndex);
                        });
                        break;
                    }

                    case 'text/uri-list':
                        data.getAsString(async (string) => {
                            const urls = string.trim().split(/\s+/);
                            const [url] = urls;
                            if (url) {
                                const hostname = new URL(url).hostname;
                                if (hostname === 'music.apple.com') {
                                    await injectAppleTracks(type, string, atIndex);
                                } else if (hostname === 'open.spotify.com') {
                                    await injectSpotifyTracks(type, string, atIndex);
                                } else {
                                    await injectUrls(urls, atIndex);
                                }
                            }
                        });
                        break;

                    case 'text/plain':
                        data.getAsString(async (string) => {
                            try {
                                const {
                                    items: [item],
                                } = JSON.parse(string);
                                if (/^(song|album|playlist)$/.test(item.kind)) {
                                    await injectAppleTracks(type, string, atIndex);
                                    return;
                                }
                            } catch {
                                // Handled below.
                            }
                            error('No music data found.');
                        });
                        break;
                }
            } else if (data[0] instanceof File) {
                await injectFiles(data as readonly File[], atIndex);
            } else {
                await injectItems(data as readonly MediaItem[], atIndex);
            }
        },
        [injectItems, injectFiles, injectUrls, injectAppleTracks, injectSpotifyTracks]
    );

    const inject = useMemo(
        () => ({
            onDrop,
            items: injectItems,
            files: injectFiles,
            urls: injectUrls,
            appleTracks: injectAppleTracks,
            spotifyTracks: injectSpotifyTracks,
        }),
        [injectItems, injectFiles, injectUrls, injectAppleTracks, injectSpotifyTracks, onDrop]
    );

    return inject;
}

async function createMediaItems(source: PlayableType): Promise<readonly MediaItem[]> {
    const isAlbumOrPlaylist = (source: PlayableType): source is MediaAlbum | MediaPlaylist => {
        return (
            'itemType' in source &&
            (source.itemType === ItemType.Album || source.itemType === ItemType.Playlist)
        );
    };
    let items: readonly (MediaItem | null)[] = [];
    if (Array.isArray(source)) {
        if (source.length === 0) {
            return [];
        } else if (isAlbumOrPlaylist(source[0])) {
            const tracks = await Promise.all(source.map((source) => fetchAllTracks(source)));
            items = tracks.flat();
        } else {
            items = source;
        }
    } else if (isAlbumOrPlaylist(source)) {
        items = await fetchAllTracks(source);
    } else {
        items = [source as MediaItem];
    }
    return items.filter(exists);
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
