import {EMPTY, debounceTime, filter, map, mergeMap, switchMap, takeUntil, timer} from 'rxjs';
import Listen from 'types/Listen';
import {findScrobble, observeUnscrobbled, updateListens} from 'services/localdb/listens';
import {observePlaybackEnd, observePlaybackStart} from 'services/mediaPlayback/playback';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {canScrobbleTrack, observeCanUpdateNowPlaying} from 'services/scrobbleSettings';
import session from 'services/session';
import {exists, Logger, partition} from 'utils';
import lastfmApi from './lastfmApi';
import {observeIsLoggedIn} from './lastfmAuth';
import LastFmHistoryPager from './LastFmHistoryPager';

const logger = new Logger('lastfmScrobbler');

export function scrobble(): void {
    const timeFuzziness = 30;
    const maxScrobbles = 50;

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observeCanUpdateNowPlaying('lastfm') : EMPTY)),
            switchMap((canUpdateNowPlaying) =>
                canUpdateNowPlaying ? observePlaybackStart() : EMPTY
            ),
            map(({currentItem}) => currentItem),
            filter(exists),
            filter((item) => canScrobbleTrack('lastfm', item)),
            switchMap((item) =>
                timer(10_000).pipe(
                    map(() => item),
                    takeUntil(observePlaybackEnd())
                )
            ),
            mergeMap((item) => lastfmApi.updateNowPlaying(item))
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observeUnscrobbled('lastfm') : EMPTY)),
            debounceTime(10_000),
            mergeMap((items) => scrobble(items))
        )
        .subscribe(logger);

    async function scrobble(listens: readonly Listen[]): Promise<void> {
        try {
            // Only scrobble listens that originated in this window.
            // Or old unscrobbled items.
            const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
            listens = listens.filter(
                (listen) =>
                    canScrobbleTrack('lastfm', listen) &&
                    (listen.sessionId === session.id || oneHourAgo > listen.playedAt)
            );
            if (listens.length === 0) {
                return;
            }
            const latestTimestamp = Math.max(
                ...listens.map((item) => item.endedAt || item.playedAt + item.duration)
            );
            const earliestTimestamp = Math.min(...listens.map((item) => item.playedAt));
            const maxSize = LastFmHistoryPager.maxPageSize;
            const params = {
                from: earliestTimestamp - timeFuzziness,
                to: latestTimestamp + timeFuzziness,
                limit: maxSize,
            };
            const pager = new LastFmHistoryPager('listens', params, {maxSize});
            const history = await fetchFirstPage(pager);
            const scrobbledAt = Math.floor(Date.now() / 1000);
            const [unscrobbled, scrobbled] = partition(
                listens,
                (listen) => !findScrobble(history, listen)
            );
            if (scrobbled.length > 0) {
                await updateListens(
                    scrobbled.map((item) => ({
                        playedAt: item.playedAt,
                        lastfmScrobbledAt: item.endedAt || scrobbledAt,
                    }))
                );
            }
            if (unscrobbled.length > 0) {
                unscrobbled.reverse();
                unscrobbled.length = Math.min(unscrobbled.length, maxScrobbles);
                await lastfmApi.scrobble(unscrobbled);
                await updateListens(
                    unscrobbled.map((item) => ({
                        playedAt: item.playedAt,
                        lastfmScrobbledAt: scrobbledAt,
                    }))
                );
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

export default {scrobble};
