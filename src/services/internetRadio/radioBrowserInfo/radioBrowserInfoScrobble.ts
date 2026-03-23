import {debounceTime, filter, map, mergeMap} from 'rxjs';
import {Logger, exists} from 'utils';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import radioBrowserInfoApi from './radioBrowserInfoApi';

const logger = new Logger('radioBrowserInfoScrobbler');

export function radioBrowserInfoScrobble(): void {
    observePlaybackStart()
        .pipe(
            map((state) => state.currentItem?.['radio-browser.info']?.stationuuid),
            filter(exists),
            debounceTime(2000),
            mergeMap((stationuuid) => reportRadioBrowserInfoPlay(stationuuid))
        )
        .subscribe(logger);
}

async function reportRadioBrowserInfoPlay(stationuuid: string): Promise<void> {
    try {
        radioBrowserInfoApi.reportClick(stationuuid);
    } catch (err) {
        logger.error(err);
    }
}
