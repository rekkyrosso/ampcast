import React, {useEffect, useMemo, useState} from 'react';
import {interval, merge} from 'rxjs';
import {delay, map, mergeMap, skip, skipWhile, switchMap, take, tap} from 'rxjs/operators';
import MediaItem from 'types/MediaItem';
import Pager from 'types/Pager';
import {lastfmRecentlyPlayed} from 'services/lastfm';
import LastFmHistoryPager from 'services/lastfm/LastFmHistoryPager';
import DualPager from 'services/pagers/DualPager';
import SubjectPager from 'services/pagers/SubjectPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {observeListens} from 'services/localdb/listens';

import {Logger} from 'utils';
import RecentlyPlayedBrowser from 'components/MediaBrowser/RecentlyPlayedBrowser';

const logger = new Logger('LastFmRecentlyPlayedBrowser');

export default function LastFmRecentlyPlayedBrowser() {
    const pager = usePager();
    return <RecentlyPlayedBrowser source={lastfmRecentlyPlayed} pager={pager} />;
}

function usePager() {
    const startAt = useMemo(() => Math.floor(Date.now() / 1000), []);
    const [pager, setPager] = useState<Pager<MediaItem> | null>(null);

    useEffect(() => {
        const recentPager = new SubjectPager<MediaItem>();
        const historyPager = new LastFmHistoryPager({to: startAt});
        const pager = new DualPager<MediaItem>(recentPager, historyPager);
        const afterScrobble$ = observeListens().pipe(skip(1), delay(20_000));
        const everyFiveMinutes$ = interval(300_000);
        const refresh$ = merge(afterScrobble$, everyFiveMinutes$);
        const subscription = historyPager
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
            .subscribe(logger);
        setPager(pager);
        return () => subscription.unsubscribe();
    }, [startAt]);

    return pager;
}

async function fetchRecentlyPlayed(from: number): Promise<readonly MediaItem[]> {
    const pager = new LastFmHistoryPager({from});
    const items = await fetchFirstPage(pager);
    return items;
}
