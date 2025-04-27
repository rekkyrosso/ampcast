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
import lastfmApi from './lastfmApi';
import {observeIsLoggedIn} from './lastfmAuth';
import LastFmHistoryPager from './LastFmHistoryPager';

const logger = new Logger('lastfmScrobbler');

export function scrobble(): void {
    const timeFuzziness = 30;
    const maxScrobbles = 50;

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observePlaybackStart() : EMPTY)),
            filter(() => scrobbleSettings.canUpdateNowPlaying('lastfm')),
            map(({currentItem}) => currentItem),
            filter(exists),
            debounceTime(10_000),
            filter((item) => canScrobble(item)),
            mergeMap((item) => lastfmApi.updateNowPlaying(item))
        )
        .subscribe(logger);

    observeIsLoggedIn()
        .pipe(
            switchMap((isLoggedIn) => (isLoggedIn ? observeListens() : EMPTY)),
            map((items) => items.filter((item) => !item.lastfmScrobbledAt)),
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
            const maxSize = LastFmHistoryPager.maxPageSize;
            const params = {
                from: earliestTimestamp - timeFuzziness,
                to: latestTimestamp + timeFuzziness,
                limit: maxSize,
            };
            const pager = new LastFmHistoryPager('listens', params, {maxSize});
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
        if (!item.noScrobble && item.title && item.artists?.[0] && item.duration > 30) {
            const service = getServiceFromSrc(item);
            // `serviceId` might be "blob" or "file" so we'll attempt to scrobble.
            return service ? scrobbleSettings.canScrobble('lastfm', service) : true;
        }
        return false;
    }
}

export default {scrobble};
