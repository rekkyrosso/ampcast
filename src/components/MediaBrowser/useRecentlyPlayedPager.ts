import {useEffect, useMemo, useState} from 'react';
import {
    Subscription,
    delay,
    interval,
    map,
    merge,
    mergeMap,
    skip,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs';
import MediaItem from 'types/MediaItem';
import Pager from 'types/Pager';
import SubjectPager from 'services/pagers/SubjectPager';
import WrappedPager from 'services/pagers/WrappedPager';
import {observeListens} from 'services/localdb/listens';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {Logger} from 'utils';

const logger = new Logger('useRecentlyPlayedPager');

export default function useRecentlyPlayedPager(
    createHistoryPager: (from?: number, to?: number) => Pager<MediaItem>
) {
    const startAt = useMemo(() => Math.floor(Date.now() / 1000), []);
    const [pager, setPager] = useState<Pager<MediaItem> | null>(null);
    const [total, seTotal] = useState<number | undefined>(undefined);

    useEffect(() => {
        const recentPager = new SubjectPager<MediaItem>();
        const historyPager = createHistoryPager(undefined, startAt);
        const pager = new WrappedPager<MediaItem>(recentPager, historyPager);
        const afterScrobble$ = observeListens().pipe(skip(1), delay(20_000));
        const everyFiveMinutes$ = interval(300_000);
        const refresh$ = merge(afterScrobble$, everyFiveMinutes$);
        const subscription = new Subscription();

        const fetchRecentlyPlayed = async (time: number) => {
            const pager = createHistoryPager(time);
            const items = await fetchFirstPage(pager);
            return items;
        };

        subscription.add(
            historyPager
                .observeItems()
                .pipe(
                    skipWhile((items) => items.length === 0),
                    take(1),
                    map((items) => items[0].playedAt),
                    switchMap((playedAt) =>
                        refresh$.pipe(
                            mergeMap(() => fetchRecentlyPlayed(playedAt + 1)),
                            tap((items) => recentPager.next(items))
                        )
                    )
                )
                .subscribe(logger)
        );

        subscription.add(pager.observeSize().pipe(tap(seTotal)).subscribe(logger));

        recentPager.next([]);
        setPager(pager);

        return () => subscription.unsubscribe();
    }, [startAt, createHistoryPager]);

    return {pager, total};
}
