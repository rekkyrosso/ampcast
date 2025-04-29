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
} from 'rxjs';
import MediaItem from 'types/MediaItem';
import Pager from 'types/Pager';
import {Logger} from 'utils';
import {observePlaybackStart} from 'services/mediaPlayback/playback';
import {observeListens} from 'services/localdb/listens';
import SubjectPager from 'services/pagers/SubjectPager';
import WrappedPager from 'services/pagers/WrappedPager';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {getCurrentTrack} from 'services/playlist';
import {isSameTrack} from 'services/metadata';

const logger = new Logger('useRecentlyPlayedPager');

export default function useRecentlyPlayedPager(
    createHistoryPager: (from?: number, to?: number) => Pager<MediaItem>,
    createNowPlayingPager: () => Pager<MediaItem> | undefined
) {
    const startAt = useMemo(() => Math.floor(Date.now() / 1000), []);
    const [pager, setPager] = useState<Pager<MediaItem> | null>(null);
    const [total, setTotal] = useState<number | undefined>(undefined);

    useEffect(() => {
        const historyPager = createHistoryPager(undefined, startAt);
        const recentPager = new SubjectPager<MediaItem>({pageSize: historyPager.pageSize});
        const pager = new WrappedPager<MediaItem>(recentPager, historyPager);
        const afterScrobble$ = observeListens().pipe(skip(1), delay(20_000));
        const afterPlaybackStart$ = observePlaybackStart().pipe(delay(15_000));
        const everyTwoMinutes$ = interval(120_000);
        const refresh$ = merge(
            of(undefined),
            afterScrobble$,
            afterPlaybackStart$,
            everyTwoMinutes$
        );
        const subscription = new Subscription();

        const fetchRecentlyPlayed = async (time: number) => {
            let items: readonly MediaItem[];
            const historyPager = createHistoryPager(time);
            const nowPlayingPager = createNowPlayingPager?.();
            if (nowPlayingPager) {
                const [[nowPlaying], history] = await Promise.all([
                    fetchFirstPage(nowPlayingPager),
                    fetchFirstPage(historyPager),
                ]);
                if (nowPlaying) {
                    let thumbnails = nowPlaying.thumbnails;
                    if (!thumbnails?.length) {
                        const currentTrack = getCurrentTrack();
                        if (currentTrack && isSameTrack(nowPlaying, currentTrack)) {
                            thumbnails = currentTrack?.thumbnails;
                        }
                    }
                    return [{...nowPlaying, thumbnails}, ...history];
                } else {
                    return history;
                }
            } else {
                items = await fetchFirstPage(historyPager);
            }
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
                            concatMap(() =>
                                recentPager.next(() => fetchRecentlyPlayed(playedAt + 1))
                            )
                        )
                    )
                )
                .subscribe(logger)
        );

        subscription.add(pager.observeSize().subscribe(setTotal));

        recentPager.next(async () => []);
        setPager(pager);

        return () => subscription.unsubscribe();
    }, [startAt, createHistoryPager, createNowPlayingPager]);

    return {pager, total};
}
