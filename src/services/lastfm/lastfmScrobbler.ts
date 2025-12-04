import {EMPTY, debounceTime, filter, map, mergeMap, switchMap, takeUntil, timer} from 'rxjs';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import {findScrobble, observeListens, updateListens} from 'services/localdb/listens';
import {observePlaybackEnd, observePlaybackStart} from 'services/mediaPlayback/playback';
import {getServiceFromSrc} from 'services/mediaServices';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import scrobbleSettings, {observeCanUpdateNowPlaying} from 'services/scrobbleSettings';
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
            filter((item) => canScrobble(item)),
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
            switchMap((isLoggedIn) => (isLoggedIn ? observeListens() : EMPTY)),
            map((items) => items.filter((item) => !item.lastfmScrobbledAt)),
            debounceTime(10_000),
            mergeMap((items) => scrobble(items))
        )
        .subscribe(logger);

    async function scrobble(listens: Listen[]): Promise<void> {
        try {
            // Only scrobble listens that originated in this window.
            // Or old unscrobbled items.
            const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
            listens = listens.filter(
                (listen) =>
                    !listen.lastfmScrobbledAt &&
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
            const [ignore, unscrobbled] = partition(
                listens,
                (listen) => !canScrobble(listen) || !!findScrobble(history, listen)
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
        if (lastfmApi.canScrobble(item)) {
            const service = getServiceFromSrc(item);
            // `serviceId` might be "blob" or "file" so we'll attempt to scrobble.
            return service ? scrobbleSettings.canScrobble('lastfm', service) : true;
        }
        return false;
    }
}

export default {scrobble};
