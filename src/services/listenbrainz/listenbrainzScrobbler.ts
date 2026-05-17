import {EMPTY, debounceTime, filter, map, mergeMap, switchMap, takeUntil, timer} from 'rxjs';
import Listen from 'types/Listen';
import {findScrobble, observeUnscrobbled, updateListens} from 'services/localdb/listens';
import {observePlaybackEnd, observePlaybackStart} from 'services/mediaPlayback/playback';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {canScrobbleTrack, observeCanUpdateNowPlaying} from 'services/scrobbleSettings';
import session from 'services/session';
import {exists, Logger, partition} from 'utils';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';

const logger = new Logger('listenbrainzScrobbler');

export function scrobble(): void {
    const timeFuzziness = 30;
    const maxScrobbles = 50;

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) =>
                isLoggedIn ? observeCanUpdateNowPlaying('listenbrainz') : EMPTY
            ),
            switchMap((canUpdateNowPlaying) =>
                canUpdateNowPlaying ? observePlaybackStart() : EMPTY
            ),
            map(({currentItem}) => currentItem),
            filter(exists),
            filter((item) => canScrobbleTrack('listenbrainz', item)),
            switchMap((item) =>
                timer(10_000).pipe(
                    map(() => item),
                    takeUntil(observePlaybackEnd())
                )
            ),
            mergeMap((item) => listenbrainzApi.updateNowPlaying(item))
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observeUnscrobbled('listenbrainz') : EMPTY)),
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
                    canScrobbleTrack('listenbrainz', listen) &&
                    (listen.sessionId === session.id || oneHourAgo > listen.playedAt)
            );
            if (listens.length === 0) {
                return;
            }
            const latestTimestamp = Math.max(
                ...listens.map((item) => item.endedAt || item.playedAt + item.duration)
            );
            const earliestTimestamp = Math.min(...listens.map((item) => item.playedAt));
            const maxSize = ListenBrainzHistoryPager.maxPageSize;
            const params = {
                min_ts: earliestTimestamp - timeFuzziness,
                max_ts: latestTimestamp + timeFuzziness,
                count: maxSize,
            };
            const pager = new ListenBrainzHistoryPager('listens', params, undefined, {maxSize});
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
                        listenbrainzScrobbledAt: item.endedAt || scrobbledAt,
                    }))
                );
            }
            if (unscrobbled.length > 0) {
                unscrobbled.reverse();
                unscrobbled.length = Math.min(unscrobbled.length, maxScrobbles);
                await listenbrainzApi.scrobble(unscrobbled);
                await updateListens(
                    unscrobbled.map((item) => ({
                        playedAt: item.playedAt,
                        listenbrainzScrobbledAt: scrobbledAt,
                    }))
                );
            }
        } catch (err) {
            logger.error(err);
        }
    }
}

export default {scrobble};
