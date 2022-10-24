import {EMPTY} from 'rxjs';
import {debounceTime, filter, map, mergeMap, switchMap} from 'rxjs/operators';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import localdb from 'services/localdb';
import {observePlaybackStart} from 'services/mediaPlayback';
import {fetchFirstPage, Logger, partition} from 'utils';
import lastfmApi from './lastfmApi';
import {observeIsLoggedIn} from './lastfmAuth';
import LastFmHistoryPager from './LastFmHistoryPager';

console.log('module::lastfmScrobbler');

const logger = new Logger('lastfmScrobbler');

const timeFuzziness = 30;
const maxScrobbles = 50;

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
        mergeMap(({currentItem}) => lastfmApi.updateNowPlaying(currentItem!))
    )
    .subscribe(logger);

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? localdb.observeListens() : EMPTY)),
        map((items) => items.filter((item) => !item.lastfmScrobbledAt)),
        filter((items) => items.length > 0),
        debounceTime(10_000),
        mergeMap(scrobble)
    )
    .subscribe(logger);

async function scrobble(items: Listen[]): Promise<void> {
    const latestTimestamp = items[0].playedAt;
    const earliestTimestamp = items.at(-1)!.playedAt;
    const pager = new LastFmHistoryPager({
        from: earliestTimestamp - timeFuzziness,
        to: latestTimestamp + timeFuzziness,
        limit: LastFmHistoryPager.maxPageSize,
    });
    const history = await fetchFirstPage(pager);
    const historyIds = history.map(getListenId);
    const [scrobbled, unscrobbled] = partition(
        items,
        (item) => historyIds.includes(getListenId(item))
    );
    await localdb.updateListens(scrobbled.map(item => ({...item, lastfmScrobbledAt: -1})));
    if (unscrobbled.length > 0) {
        unscrobbled.reverse();
        unscrobbled.length = Math.min(unscrobbled.length, maxScrobbles);
        await lastfmApi.scrobble(unscrobbled);
        const lastfmScrobbledAt = Math.floor(Date.now() / 1000);
        await localdb.updateListens(unscrobbled.map((item) => ({...item, lastfmScrobbledAt})));
    }
}

function getListenId(item: MediaItem): number {
    return Math.round(item.playedAt / timeFuzziness);
}
