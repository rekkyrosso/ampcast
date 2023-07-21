import React, {useEffect, useMemo, useState} from 'react';
import {
    Subscription,
    delay,
    interval,
    merge,
    map,
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
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {observeListens} from 'services/localdb/listens';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import {Logger} from 'utils';
import LastFmHistoryPager from '../LastFmHistoryPager';
import lastfm, {lastfmRecentlyPlayed} from '../lastfm';

const logger = new Logger('LastFmRecentlyPlayedBrowser');

export default function LastFmRecentlyPlayedBrowser() {
    const {pager, total} = usePager();
    return (
        <RecentlyPlayedBrowser
            service={lastfm}
            source={lastfmRecentlyPlayed}
            pager={pager}
            total={total}
        />
    );
}

function usePager() {
    const startAt = useMemo(() => Math.floor(Date.now() / 1000), []);
    const [pager, setPager] = useState<Pager<MediaItem> | null>(null);
    const [total, seTotal] = useState<number | undefined>(undefined);

    useEffect(() => {
        const recentPager = new SubjectPager<MediaItem>();
        const historyPager = new LastFmHistoryPager({to: startAt});
        const pager = new WrappedPager<MediaItem>(recentPager, historyPager);
        const afterScrobble$ = observeListens().pipe(skip(1), delay(20_000));
        const everyFiveMinutes$ = interval(300_000);
        const refresh$ = merge(afterScrobble$, everyFiveMinutes$);
        const subscription = new Subscription();

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
    }, [startAt]);

    return {pager, total};
}

async function fetchRecentlyPlayed(from: number): Promise<readonly MediaItem[]> {
    const pager = new LastFmHistoryPager({from});
    const items = await fetchFirstPage(pager);
    return items;
}
