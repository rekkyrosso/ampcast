import MediaItem from 'types/MediaItem';
import plexSettings from './plexSettings';
import plexApi from './plexApi';

console.log('module::plexPlayback');

let playQueue: plex.PlayQueue | null = null; // TODO: Do this better.

export async function reportStart(item: MediaItem): Promise<void> {
    const [, , key] = item.src.split(':');
    playQueue = await createPlayQueue(key);
    await reportState(item, 0, 'playing');
}

export async function reportStop(item: MediaItem): Promise<void> {
    await reportState(item, 0, 'stopped', true);
}

export async function reportProgress(
    item: MediaItem,
    currentTime: number,
    state: 'paused' | 'playing'
): Promise<void> {
    await reportState(item, currentTime, state);
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

const plexPlayback = {
    reportStart,
    reportStop,
    reportProgress,
};

export default plexPlayback;
