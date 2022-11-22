import {EMPTY} from 'rxjs';
import {debounceTime, filter, map, mergeMap, switchMap} from 'rxjs/operators';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import {getListenId, findScrobble, observeListens, updateListens} from 'services/localdb/listens';
import {observePlaybackStart} from 'services/mediaPlayback';
import mediaServices from 'services/mediaServices';
import scrobbleSettings from 'services/scrobbleSettings';
import {exists, fetchFirstPage, Logger, partition} from 'utils';
import lastfmApi from './lastfmApi';
import {observeIsLoggedIn} from './lastfmAuth';
import LastFmHistoryPager from './LastFmHistoryPager';
import lastfm from './lastfm';

console.log('module::lastfmScrobbler');

const logger = new Logger('lastfmScrobbler');

const timeFuzziness = 30;
const maxScrobbles = 50;

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
        filter(() => scrobbleSettings.canUpdateNowPlaying(lastfm)),
        map(({currentItem}) => currentItem),
        filter(exists),
        filter((item) => canScrobble(item)),
        mergeMap((item) => lastfmApi.updateNowPlaying(item))
    )
    .subscribe(logger);

observeIsLoggedIn()
    .pipe(
        switchMap((isLoggedIn) => (isLoggedIn ? observeListens() : EMPTY)),
        map((items) => items.filter((item) => !item.lastfmScrobbledAt)),
        debounceTime(10_000),
        mergeMap(scrobble)
    )
    .subscribe(logger);

async function scrobble(items: Listen[]): Promise<void> {
    try {
        if (items.length === 0) {
            return;
        }
        const latestTimestamp = items[0].playedAt + Math.floor(items[0].duration);
        const earliestTimestamp = items.at(-1)!.playedAt;
        const pager = new LastFmHistoryPager({
            from: earliestTimestamp - timeFuzziness,
            to: latestTimestamp + timeFuzziness,
            limit: LastFmHistoryPager.maxPageSize,
        });
        const history = await fetchFirstPage(pager);
        const historyIds = history.map((item) => getListenId(item, timeFuzziness));
        const [ignore, unscrobbled] = partition(
            items,
            (item) =>
                !canScrobble(item) ||
                historyIds.includes(getListenId(item, timeFuzziness)) ||
                !!findScrobble(history, item)
        );
        await updateListens(ignore.map((item) => ({...item, lastfmScrobbledAt: -1})));
        if (unscrobbled.length > 0) {
            unscrobbled.reverse();
            unscrobbled.length = Math.min(unscrobbled.length, maxScrobbles);
            await lastfmApi.scrobble(unscrobbled);
            const lastfmScrobbledAt = Math.floor(Date.now() / 1000);
            await updateListens(unscrobbled.map((item) => ({...item, lastfmScrobbledAt})));
        }
    } catch (err) {
        logger.error(err);
    }
}

function canScrobble(item: MediaItem): boolean {
    const [serviceId] = item.src.split(':');
    const service = mediaServices.get(serviceId);
    // `serviceId` might be "blob" or "file" so we'll attempt to scrobble.
    return service ? scrobbleSettings.canScrobble(lastfm, service) : true;
}
