import {useEffect, useMemo, useState} from 'react';
import {
    Subscription,
    concatMap,
    delay,
    interval,
    map,
    merge,
    of,
    skip,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs';
import MediaItem from 'types/MediaItem';
import Pager from 'types/Pager';
import {Logger, partition, uniqBy} from 'utils';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import {observeListens} from 'services/localdb/listens';
import SubjectPager from 'services/pagers/SubjectPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';

const logger = new Logger('useScrobblesPager');

export default function useScrobblesPager(
    createHistoryPager: (from?: number, to?: number) => Pager<MediaItem>,
    createNowPlayingPager?: () => Pager<MediaItem> | undefined,
    delayAfterListen = 3_000
) {
    const startAt = useMemo(() => Math.floor(Date.now() / 1000), []);
    const [pager, setPager] = useState<Pager<MediaItem> | null>(null);
    const [total, setTotal] = useState<number | undefined>(undefined);

    useEffect(() => {
        const recentItemsPager = new SubjectPager<MediaItem>();
        const historyPager = createHistoryPager(undefined, startAt);
        const pager = new WrappedPager<MediaItem>(recentItemsPager, historyPager);
        const afterPlaybackStart$ = observePlaybackStart().pipe(delay(15_000));
        const afterListen$ = observeListens().pipe(skip(1), delay(delayAfterListen));
        const everyMinute$ = interval(60_000);
        const refresh$ = merge(
            ...[afterPlaybackStart$, afterListen$, everyMinute$].concat(
                createNowPlayingPager ? [of(0)] : []
            )
        );
        const subscription = new Subscription();

        let lastPlayedAt = 0;

        const fetchRecentlyPlayed = async () => {
            if (lastPlayedAt) {
                let nowPlaying: MediaItem | undefined;
                let items: readonly MediaItem[] = [];
                const historyPager = createHistoryPager(lastPlayedAt + 1);
                const nowPlayingPager = createNowPlayingPager?.();
                if (nowPlayingPager) {
                    [[nowPlaying], items] = await Promise.all([
                        fetchFirstPage(nowPlayingPager),
                        fetchFirstPage(historyPager),
                    ]);
                } else {
                    items = await fetchFirstPage(historyPager);
                }
                lastPlayedAt = items[0]?.playedAt || lastPlayedAt + 1;
                // Try to retain previous items. They may have additional metadata and thumbnails.
                const prevItems = await fetchFirstPage(recentItemsPager, {
                    timeout: 500,
                    keepAlive: true,
                });
                const [[prevNowPlaying], prevRecentItems] = partition(prevItems, (item) =>
                    item.src.endsWith(':now-playing')
                );
                const recentItems = uniqBy(
                    'playedAt',
                    items
                        .map(
                            (item) =>
                                prevRecentItems.find(
                                    (prevItem) => prevItem.playedAt === item.playedAt
                                ) || item
                        )
                        .concat(prevRecentItems)
                );
                nowPlaying =
                    nowPlaying?.title === prevNowPlaying?.title &&
                    String(nowPlaying?.artists) === String(prevNowPlaying?.artists)
                        ? prevNowPlaying
                        : nowPlaying;
                recentItemsPager.next(nowPlaying ? [nowPlaying, ...recentItems] : recentItems);
            }
        };

        subscription.add(
            historyPager
                .observeItems()
                .pipe(
                    skipWhile((items) => items.length === 0),
                    take(1),
                    map((items) => items[0].playedAt),
                    tap((playedAt) => (lastPlayedAt = playedAt)),
                    switchMap(() => refresh$.pipe(concatMap(() => fetchRecentlyPlayed())))
                )
                .subscribe(logger)
        );

        subscription.add(pager.observeSize().subscribe(setTotal));
        subscription.add(() => pager.disconnect());

        recentItemsPager.next([]);
        setPager(pager);

        return () => subscription.unsubscribe();
    }, [startAt, delayAfterListen, createHistoryPager, createNowPlayingPager]);

    return {pager, total};
}
