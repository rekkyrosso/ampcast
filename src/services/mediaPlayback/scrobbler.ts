import {filter, mergeMap, tap} from 'rxjs';
import {isMiniPlayer, Logger} from 'utils';
import {addListen} from 'services/localdb/listens';
import {observeMediaServices} from 'services/mediaServices';
import {observePlaybackEnd} from './playback';

if (!isMiniPlayer) {
    const logger = new Logger('mediaPlayback/scrobbler');
    const registeredScrobblers: Record<string, boolean> = {};

    observePlaybackEnd()
        .pipe(mergeMap((state) => addListen(state)))
        .subscribe(logger);

    observeMediaServices()
        .pipe(
            mergeMap((services) => services),
            filter((service) => !registeredScrobblers[service.id]),
            tap((service) => (registeredScrobblers[service.id] = true)),
            tap((service) => service.scrobble?.())
        )
        .subscribe(logger);
}
