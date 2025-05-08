import {EMPTY, debounceTime, filter, map, mergeMap, switchMap} from 'rxjs';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import {getListenId, findScrobble, observeListens, updateListens} from 'services/localdb/listens';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import {getServiceFromSrc} from 'services/mediaServices';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import scrobbleSettings from 'services/scrobbleSettings';
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
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(() => scrobbleSettings.canUpdateNowPlaying('listenbrainz')),
            map(({currentItem}) => currentItem),
            filter(exists),
            debounceTime(10_000),
            filter((item) => canScrobble(item)),
            mergeMap((item) => listenbrainzApi.updateNowPlaying(item))
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observeListens() : EMPTY)),
            map((items) => items.filter((item) => !item.listenbrainzScrobbledAt)),
            debounceTime(10_000),
            mergeMap((items) => scrobble(items))
        )
        .subscribe(logger);

    async function scrobble(items: Listen[]): Promise<void> {
        try {
            // Only scrobble listens that originated in this window.
            // Or old unscrobbled items.
            const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
            items = items.filter(
                (listen) => listen.sessionId === session.id || oneHourAgo > listen.playedAt
            );
            if (items.length === 0) {
                return;
            }
            const latestTimestamp = items[0].playedAt + Math.floor(items[0].duration);
            const earliestTimestamp = items.at(-1)!.playedAt;
            const maxSize = ListenBrainzHistoryPager.maxPageSize;
            const params = {
                min_ts: earliestTimestamp - timeFuzziness,
                max_ts: latestTimestamp + timeFuzziness,
                count: maxSize,
            };
            const pager = new ListenBrainzHistoryPager('listens', params, undefined, {maxSize});
            const history = await fetchFirstPage(pager);
            const historyIds = history.map((item) => getListenId(item, timeFuzziness));
            const [ignore, unscrobbled] = partition(
                items,
                (item) =>
                    !canScrobble(item) ||
                    historyIds.includes(getListenId(item, timeFuzziness)) ||
                    !!findScrobble(history, item)
            );
            await updateListens(ignore.map((item) => ({...item, listenbrainzScrobbledAt: -1})));
            if (unscrobbled.length > 0) {
                unscrobbled.reverse();
                unscrobbled.length = Math.min(unscrobbled.length, maxScrobbles);
                await listenbrainzApi.scrobble(unscrobbled);
                const listenbrainzScrobbledAt = Math.floor(Date.now() / 1000);
                await updateListens(
                    unscrobbled.map((item) => ({...item, listenbrainzScrobbledAt}))
                );
            }
        } catch (err) {
            logger.error(err);
        }
    }

    function canScrobble(item: MediaItem): boolean {
        if (listenbrainzApi.canScrobble(item)) {
            const service = getServiceFromSrc(item);
            // `serviceId` might be "blob" or "file" so we'll attempt to scrobble.
            return service ? scrobbleSettings.canScrobble('listenbrainz', service) : true;
        }
        return false;
    }
}

export default {scrobble};
