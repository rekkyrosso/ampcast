import {
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    of,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import LinearType from 'types/LinearType';
import PlaybackType from 'types/PlaybackType';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';
import {observePaused, observePlaybackStart} from 'services/mediaPlayback/playback';
import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import {observeCurrentItem} from 'services/playlist';
import {fetchNowPlaying} from './onlineRadioBox';
import {radioBrowserInfoApi} from './radioBrowserInfo';

const logger = new Logger('internetRadioScrobbler');

export function scrobble(): void {
    observePlaybackStart()
        .pipe(
            filter((state) => !!state.currentItem?.['radio-browser.info']),
            debounceTime(2000),
            mergeMap(({currentItem}) => reportRadioBrowserInfoPlay(currentItem!))
        )
        .subscribe(logger);

    // Refresh `nowPlaying` state.
    observePaused()
        .pipe(
            switchMap((paused) =>
                paused // Internet radio streams can't be paused so this is the same as "stopped".
                    ? of(null)
                    : observeCurrentItem().pipe(
                          map((item) => (isInternetRadio(item) ? item : null)),
                          distinctUntilChanged((a, b) => a?.src === b?.src),
                          switchMap((item) =>
                              item
                                  ? timer(500, 12_000).pipe(
                                        mergeMap(() =>
                                            fetchNowPlaying(item, mediaPlayer.nowPlaying)
                                        )
                                    )
                                  : of(null)
                          )
                      )
            ),
            distinctUntilChanged((a, b) => a?.src === b?.src),
            tap((item) => (mediaPlayer.nowPlaying = item))
        )
        .subscribe(logger);
}

function isInternetRadio(item: PlaylistItem | null): boolean {
    return (
        !!item &&
        item.linearType === LinearType.Station &&
        /^https?:/.test(item.src) &&
        // Hopefully, other playback types will acquire metadata for us.
        (item.playbackType === undefined ||
            item.playbackType === PlaybackType.Direct ||
            item.playbackType === PlaybackType.HLS)
    );
}

async function reportRadioBrowserInfoPlay(item: PlaylistItem): Promise<void> {
    try {
        radioBrowserInfoApi.reportClick(item['radio-browser.info']!.stationuuid);
    } catch (err) {
        logger.error(err);
    }
}

export default {scrobble};
