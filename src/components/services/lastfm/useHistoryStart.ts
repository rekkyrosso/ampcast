import {useEffect, useState} from 'react';
import {from, of, throwError} from 'rxjs';
import {filter, map, tap, mergeMap} from 'rxjs/operators';
import lastfmApi from 'services/lastfm/lastfmApi';
import LastFmHistoryPager from 'services/lastfm/LastFmHistoryPager';
import lastfmSettings from 'services/lastfm/lastfmSettings';
import {exists, fetchFirstPage, formatDate, Logger} from 'utils';

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
                    map((page) => new LastFmHistoryPager({page}, {pageSize})),
                    mergeMap(fetchFirstPage),
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
