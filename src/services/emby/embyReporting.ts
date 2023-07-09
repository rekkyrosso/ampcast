import MediaItem from 'types/MediaItem';
import {Logger} from 'utils';
import embyApi from './embyApi';
import {EmbySettings} from './embySettings';

const logger = new Logger('embyReporting');

export async function reportStart(item: MediaItem, settings?: EmbySettings): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await embyApi.post(
            'Sessions/Playing',
            {
                ItemId,
                IsPaused: false,
                PositionTicks: 0,
                PlayMethod: 'Transcode',
            },
            settings
        );
    } catch (err) {
        logger.error(err);
    }
}

export async function reportStop(
    item: MediaItem,
    currentTime: number,
    settings?: EmbySettings
): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await embyApi.post(
            'Sessions/Playing/Stopped',
            {
                ItemId,
                IsPaused: false,
                PositionTicks: Math.floor(currentTime * 10_000_000),
                PlayMethod: 'Transcode',
            },
            settings
        );
    } catch (err) {
        logger.error(err);
    }
}

export async function reportProgress(
    item: MediaItem,
    currentTime: number,
    paused: boolean,
    eventName: 'pause' | 'unpause' | 'timeupdate',
    settings?: EmbySettings
): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await embyApi.post(
            'Sessions/Playing/Progress',
            {
                ItemId,
                IsPaused: paused,
                PositionTicks: Math.floor(currentTime * 10_000_000),
                PlayMethod: 'Transcode',
                EventName: eventName,
            },
            settings
        );
    } catch (err) {
        logger.error(err);
    }
}
