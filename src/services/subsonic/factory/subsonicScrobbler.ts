import {EMPTY, filter, mergeMap, switchMap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaService from 'types/MediaService';
import PlaybackState from 'types/PlaybackState';
import {isListenedTo} from 'services/localdb/listens';
import {observePlaybackStart, observePlaybackEnd} from 'services/mediaPlayback/playback';
import {Logger} from 'utils';
import SubsonicApi from './SubsonicApi';

export function scrobble(service: MediaService, api: SubsonicApi): void {
    const logger = new Logger(`${service.id}Scrobbler`);

    const isValidItem = ({currentItem}: PlaybackState): boolean =>
        !!currentItem?.src.startsWith(`${service.id}:`) && !currentItem.linearType;

    const reportStart = async (item: MediaItem): Promise<void> => {
        try {
            const [, , id] = item.src.split(':');
            await api.scrobble({id, submission: false});
        } catch (err) {
            logger.error(err);
        }
    };

    const reportStop = async (item: MediaItem, time: number): Promise<void> => {
        try {
            if (isListenedTo(item.duration, time, Date.now())) {
                const [, , id] = item.src.split(':');
                await api.scrobble({id, time, submission: true});
            }
        } catch (err) {
            logger.error(err);
        }
    };

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem}) => reportStart(currentItem!))
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, startedAt}) => reportStop(currentItem!, startedAt))
        )
        .subscribe(logger);
}

export default {scrobble};
