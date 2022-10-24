import MediaItem from 'types/MediaItem';
import Logger from 'utils/Logger';
import jellyfinApi from './jellyfinApi';

console.log('module::jellyfinPlayback');

const logger = new Logger('jellyfinPlayback');

export async function reportStart(item: MediaItem): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await jellyfinApi.post('Sessions/Playing', {
            ItemId,
            IsPaused: false,
            PositionTicks: 0,
            PlayMethod: 'Transcode',
        });
    } catch (err) {
        logger.error(err);
    }
}

export async function reportStop(item: MediaItem, currentTime: number): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await jellyfinApi.post('Sessions/Playing/Stopped', {
            ItemId,
            IsPaused: false,
            PositionTicks: Math.floor(currentTime * 10_000_000),
            PlayMethod: 'Transcode',
        });
    } catch (err) {
        logger.error(err);
    }
}

export async function reportProgress(
    item: MediaItem,
    currentTime: number,
    paused: boolean,
    eventName: 'pause' | 'unpause' | 'timeupdate'
): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await jellyfinApi.post('Sessions/Playing/Progress', {
            ItemId,
            IsPaused: paused,
            PositionTicks: Math.floor(currentTime * 10_000_000),
            PlayMethod: 'Transcode',
            EventName: eventName,
        });
    } catch (err) {
        logger.error(err);
    }
}

const jellyfinPlayback = {
    reportStart,
    reportStop,
    reportProgress,
};

export default jellyfinPlayback;
