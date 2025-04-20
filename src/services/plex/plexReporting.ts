import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi from './plexApi';

const logger = new Logger('plexReporting');

let playQueueItemID = '';

export async function reportStart(item: MediaItem): Promise<void> {
    try {
        playQueueItemID = '';
        playQueueItemID = await createPlayQueueItemId(item);
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

async function createPlayQueueItemId(item: MediaItem): Promise<string> {
    const [, , ratingKey] = item.src.split(':');
    const key = `/library/metadata/${ratingKey}`;
    const {MediaContainer: playQueue} = await plexApi.fetchJSON<plex.PlayQueueResponse>({
        path: '/playQueues',
        method: 'POST',
        params: {
            key,
            type: 'music',
            uri: `server://${plexSettings.serverId}/com.plexapp.plugins.library${key}`,
            continuous: '0',
            repeat: '0',
            own: '1',
        },
    });
    return String(playQueue.playQueueSelectedItemID);
}
