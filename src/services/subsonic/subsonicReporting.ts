import MediaItem from 'types/MediaItem';
import {isListenedTo} from 'services/localdb/listens';
import {Logger} from 'utils';
import subsonicApi, {SubsonicSettings} from './subsonicApi';

const logger = new Logger('subsonicReporting');

export async function reportStart(item: MediaItem, settings?: SubsonicSettings): Promise<void> {
    try {
        const [, , id] = item.src.split(':');
        await subsonicApi.scrobble({id, submission: false}, settings);
    } catch (err) {
        logger.error(err);
    }
}

export async function reportStop(
    item: MediaItem,
    time: number,
    settings?: SubsonicSettings
): Promise<void> {
    try {
        if (isListenedTo(item.duration, time, Date.now())) {
            const [, , id] = item.src.split(':');
            await subsonicApi.scrobble({id, time, submission: true}, settings);
        }
    } catch (err) {
        logger.error(err);
    }
}
