import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi, {musicPlayHost, musicProviderHost} from './plexApi';

const logger = new Logger('plexReporting');

let playQueue: plex.PlayQueue | null = null; // TODO: Do this better.

export async function reportStart(item: MediaItem): Promise<void> {
    try {
        playQueue = null;
        playQueue = await createPlayQueue(item);
        await reportState(item, 0, 'playing');
    } catch (err) {
        logger.error(err);
    }
}

export async function reportStop(item: MediaItem): Promise<void> {
    try {
        await reportState(item, 0, 'stopped', true);
        playQueue = null;
    } catch (err) {
        logger.error(err);
    }
}

export async function reportProgress(
    item: MediaItem,
    currentTime: number,
    state: 'paused' | 'playing'
): Promise<void> {
    try {
        await reportState(item, currentTime, state);
    } catch (err) {
        logger.error(err);
    }
}

async function reportState(
    item: MediaItem,
    currentTime: number,
    state: 'stopped' | 'paused' | 'playing' | 'buffering' | 'error',
    keepalive?: boolean
): Promise<void> {
    if (!playQueue) {
        logger.warn(`Cannot report state (${state}): playQueue not defined`);
        return;
    }
    const [serviceId, , ratingKey] = item.src.split(':');
    const isTidal = serviceId === 'plex-tidal';
    await plexApi.fetch({
        host: isTidal ? musicProviderHost : undefined,
        path: isTidal ? '/timeline' : '/:/timeline',
        params: {
            key: `/library/metadata/${ratingKey}`,
            ratingKey,
            playQueueItemID: String(playQueue!.playQueueSelectedItemID),
            state,
            time: String(Math.floor(currentTime * 1000)),
            duration: String(Math.floor(item.duration * 1000)),
        },
        keepalive,
    });
}

async function createPlayQueue(item: MediaItem): Promise<plex.PlayQueue> {
    const [serviceId, , ratingKey] = item.src.split(':');
    const key = `/library/metadata/${ratingKey}`;
    const isTidal = serviceId === 'plex-tidal';
    return plexApi.fetchJSON({
        host: isTidal ? musicPlayHost : undefined,
        path: '/playQueues',
        method: 'POST',
        params: {
            key,
            type: 'music',
            uri: isTidal
                ? `provider://tv.plex.provider.music${key}`
                : `server://${
                      plexSettings.server!.clientIdentifier
                  }/com.plexapp.plugins.library${key}`,
            continuous: '0',
            repeat: '0',
            own: '1',
        },
    });
}
