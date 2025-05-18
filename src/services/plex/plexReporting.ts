import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import plexApi from './plexApi';

const logger = new Logger('plexReporting');

let mainPlayQueueItemID = 0;

export async function reportStart(item: MediaItem): Promise<void> {
    try {
        if (!item.linearType) {
            mainPlayQueueItemID = 0;
            const playQueue = await plexApi.createPlayQueue(item);
            mainPlayQueueItemID = playQueue.playQueueSelectedItemID;
        }
        await reportState(item, 'playing', item.startTime);
    } catch (err) {
        logger.error(err);
    }
}

export async function reportStop(item: MediaItem): Promise<void> {
    try {
        await reportState(item, 'stopped');
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
        await reportState(item, state, currentTime);
    } catch (err) {
        logger.error(err);
    }
}

async function reportState(
    item: MediaItem,
    state: 'stopped' | 'paused' | 'playing' | 'buffering' | 'error',
    currentTime = 0
): Promise<void> {
    const playQueueItemID = item.linearType ? item.plex?.playQueueItemID : mainPlayQueueItemID;
    if (playQueueItemID) {
        const [, , ratingKey] = item.src.split(':');
        await plexApi.fetch({
            path: '/:/timeline',
            params: {
                key: `/library/metadata/${ratingKey}`,
                ratingKey,
                playQueueItemID,
                state,
                time: String(Math.floor(currentTime) * 1000 || 1),
                duration: String(Math.floor(item.duration * 1000)),
            },
        });
    } else {
        logger.warn('reportState: `playQueueItemID` not defined', `state=${state}`);
    }
}
