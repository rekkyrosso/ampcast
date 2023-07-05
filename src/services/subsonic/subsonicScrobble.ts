import {EMPTY, filter, mergeMap, switchMap} from 'rxjs';
import MediaService from 'types/MediaService';
import PlaybackState from 'types/PlaybackState';
import {observePlaybackStart, observePlaybackEnd} from 'services/mediaPlayback/playback';
import {Logger} from 'utils';
import {reportStart, reportStop} from './subsonicReporting';
import {SubsonicSettings} from './subsonicApi';

export default function subsonicScrobble(service: MediaService, settings: SubsonicSettings): void {
    const logger = new Logger(`${service.id}Scrobbler`);

    const isValidItem = (state: PlaybackState): boolean =>
        !!state.currentItem?.src.startsWith(`${service.id}:`);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem}) => reportStart(currentItem!, settings))
        )
        .subscribe(logger);

    service
        .observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackEnd() : EMPTY)),
            filter(isValidItem),
            mergeMap(({currentItem, startedAt}) => reportStop(currentItem!, startedAt, settings))
        )
        .subscribe(logger);
}
