import React, {useEffect, useMemo, useState} from 'react';
import {interval, merge, Subscription} from 'rxjs';
import {delay, map, mergeMap, skip, skipWhile, switchMap, take, tap} from 'rxjs/operators';
import MediaItem from 'types/MediaItem';
import Pager from 'types/Pager';
import DualPager from 'services/pagers/DualPager';
import SubjectPager from 'services/pagers/SubjectPager';
import {observeListens} from 'services/localdb/listens';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';
import {Logger} from 'utils';
import listenbrainz, {listenbrainzRecentlyPlayed} from '../listenbrainz';
import ListenBrainzHistoryPager from '../ListenBrainzHistoryPager';

const logger = new Logger('ListenBrainzRecentlyPlayedBrowser');

export default function ListenBrainzRecentlyPlayedBrowser() {
    const {pager, total} = usePager();
    return (
        <RecentlyPlayedBrowser
            service={listenbrainz}
            source={listenbrainzRecentlyPlayed}
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
        const historyPager = new ListenBrainzHistoryPager({max_ts: startAt}, true);
        const pager = new DualPager<MediaItem>(recentPager, historyPager);
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

async function fetchRecentlyPlayed(min_ts: number): Promise<readonly MediaItem[]> {
    const pager = new ListenBrainzHistoryPager({min_ts});
    const items = await fetchFirstPage(pager);
    return items;
}
