import {useEffect, useState} from 'react';
import {filter, from, map, mergeMap, of, tap, throwError} from 'rxjs';
import fetchFirstPage from 'services/pagers/fetchFirstPage';
import {exists, formatDate, Logger} from 'utils';
import lastfmApi from '../lastfmApi';
import LastFmHistoryPager from '../LastFmHistoryPager';
import lastfmSettings from '../lastfmSettings';

const serviceStartDate = '2002-11-20';

const logger = new Logger('lastfm/useHistoryStart');

export default function useHistoryStart() {
    const pageSize = 50;
    const [startedAt, setStartedAt] = useState(() => lastfmSettings.firstScrobbledAt);
    const noStartDate = startedAt === '' || startedAt === serviceStartDate;

    useEffect(() => {
        if (noStartDate) {
            setStartedAt(serviceStartDate);
            const subscription = from(lastfmApi.getUserInfo())
                .pipe(
                    map((info) => Number(info.user.playcount)),
                    mergeMap((playCount) =>
                        playCount ? of(playCount) : throwError(() => Error('No history.'))
                    ),
                    map((playCount) => Math.floor(playCount / pageSize)),
                    map((page) => new LastFmHistoryPager('listens', {page}, {pageSize})),
                    mergeMap((pager) => fetchFirstPage(pager)),
                    map((items) => items.at(-1)),
                    filter(exists),
                    map((track) => new Date(track.playedAt * 1000)),
                    map(formatDate),
                    tap((firstScrobbledAt) => (lastfmSettings.firstScrobbledAt = firstScrobbledAt)),
                    tap(setStartedAt)
                )
                .subscribe(logger);
            return () => subscription.unsubscribe();
        }
    }, [noStartDate]);

    return startedAt;
}
