import {EMPTY} from 'rxjs';
import {debounceTime, filter, map, mergeMap, switchMap} from 'rxjs/operators';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import localdb from 'services/localdb';
import {observePlaybackStart} from 'services/mediaPlayback';
import {fetchFirstPage, Logger, partition} from 'utils';
import listenbrainzApi from './listenbrainzApi';
import {observeIsLoggedIn} from './listenbrainzAuth';
import ListenBrainzHistoryPager from './ListenBrainzHistoryPager';

console.log('module::listenbrainzScrobbler');

const logger = new Logger('listenbrainzScrobbler');

const timeFuzziness = 30;
const maxScrobbles = 50;

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
        mergeMap(({currentItem}) => listenbrainzApi.updateNowPlaying(currentItem!))
    )
    .subscribe(logger);

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? localdb.observeListens() : EMPTY)),
        map((items) => items.filter((item) => !item.listenbrainzScrobbledAt)),
        filter((items) => items.length > 0),
        debounceTime(10_000),
        mergeMap(scrobble)
    )
    .subscribe(logger);

async function scrobble(items: Listen[]): Promise<void> {
    const latestTimestamp = items[0].playedAt;
    const earliestTimestamp = items.at(-1)!.playedAt;
    const pager = new ListenBrainzHistoryPager({
        min_ts: earliestTimestamp - timeFuzziness,
        max_ts: latestTimestamp + timeFuzziness,
        count: ListenBrainzHistoryPager.maxPageSize,
    });
    const history = await fetchFirstPage(pager);
    const historyIds = history.map(getListenId);
    const [scrobbled, unscrobbled] = partition(items, (item) =>
        historyIds.includes(getListenId(item))
    );
    await localdb.updateListens(scrobbled.map((item) => ({...item, listenbrainzScrobbledAt: -1})));
    if (unscrobbled.length > 0) {
        unscrobbled.reverse();
        unscrobbled.length = Math.min(unscrobbled.length, maxScrobbles);
        await listenbrainzApi.scrobble(unscrobbled);
        const listenbrainzScrobbledAt = Math.floor(Date.now() / 1000);
        await localdb.updateListens(
            unscrobbled.map((item) => ({...item, listenbrainzScrobbledAt}))
        );
    }
}

function getListenId(item: MediaItem): number {
    return Math.round(item.playedAt / timeFuzziness);
}
