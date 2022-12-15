import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import plexSettings from './plexSettings';
import plexApi from './plexApi';

console.log('module::plexReporting');

const logger = new Logger('plexReporting');

let playQueue: plex.PlayQueue | null = null; // TODO: Do this better.

export async function reportStart(item: MediaItem): Promise<void> {
    try {
        const [, , key] = item.src.split(':');
        playQueue = await createPlayQueue(key);
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
    const [, , key] = item.src.split(':');
    await plexApi.fetch({
        path: '/:/timeline',
        params: {
            key,
            ratingKey: item.plex!.ratingKey,
            playQueueItemID: String(playQueue!.playQueueSelectedItemID),
            state,
            hasMDE: '1', // No idea what this does
            time: String(Math.floor(currentTime * 1000)),
            duration: String(Math.floor(item.duration * 1000)),
        },
        keepalive,
    });
}

async function createPlayQueue(key: string): Promise<any> {
    return plexApi.fetchJSON({
        path: '/playQueues',
        method: 'POST',
        params: {
            type: 'music',
            continuous: '0',
            uri: `server://${
                plexSettings.server!.clientIdentifier
            }/com.plexapp.plugins.library/${key}`,
            repeat: '0',
            own: '1',
            includeExternalMedia: '1',
        },
    });
}

const plexReporting = {
    reportStart,
    reportStop,
    reportProgress,
};

export default plexReporting;
