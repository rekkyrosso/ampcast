import MediaItem from 'types/MediaItem';
import {LiteStorage, Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi from './plexApi';

const logger = new Logger('plexReporting');

const session = new LiteStorage('plexReporting', 'session');

export async function reportStart(item: MediaItem): Promise<void> {
    try {
        session.removeItem('queueId');
        const playQueueItemID = await createPlayQueueItemId(item);
        session.setString('queueId', playQueueItemID);
        await reportState(item, 0, 'playing');
    } catch (err) {
        logger.error(err);
    }
}

export async function reportStop(item: MediaItem): Promise<void> {
    try {
        await reportState(item, 0, 'stopped', true);
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
    const playQueueItemID = session.getString('queueId');
    if (!playQueueItemID) {
        logger.warn('reportState: `playQueueItemID` not defined', `state=${state}`);
    }
    const [, , ratingKey] = item.src.split(':');
    await plexApi.fetch({
        path: '/:/timeline',
        params: {
            key: `/library/metadata/${ratingKey}`,
            ratingKey,
            playQueueItemID,
            state,
            time: String(Math.floor(currentTime * 1000)),
            duration: String(Math.floor(item.duration * 1000)),
        },
        keepalive,
    });
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
