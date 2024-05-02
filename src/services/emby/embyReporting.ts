import MediaItem from 'types/MediaItem';
import MediaType from 'types/MediaType';
import {Logger} from 'utils';
import embyApi from './embyApi';
import {EmbySettings} from './embySettings';

const logger = new Logger('embyReporting');

export async function reportStart(
    item: MediaItem,
    PlaySessionId: string,
    settings: EmbySettings
): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await embyApi.post(
            'Sessions/Playing',
            {
                ItemId,
                IsPaused: false,
                PositionTicks: 0,
                PlayMethod: 'Transcode',
                PlaySessionId,
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
    PlaySessionId: string,
    settings: EmbySettings
): Promise<void> {
    try {
        const [, , ItemId] = item.src.split(':');
        await embyApi.post(
            'Sessions/Playing/Stopped',
            {
                ItemId,
                IsPaused: false,
                PositionTicks: Math.floor(currentTime * 10_000_000),
                PlaySessionId,
            },
            settings
        );
        if (item.mediaType === MediaType.Video) {
            await embyApi.delete(
                'Videos/ActiveEncodings',
                {
                    DeviceId: settings.deviceId,
                    PlaySessionId,
                },
                settings
            );
        }
    } catch (err) {
        logger.error(err);
    }
}

export async function reportProgress(
    item: MediaItem,
    currentTime: number,
    paused: boolean,
    eventName: 'pause' | 'unpause' | 'timeupdate',
    PlaySessionId: string,
    settings: EmbySettings
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
                PlaySessionId,
            },
            settings
        );
    } catch (err) {
        logger.error(err);
    }
}
