import {useEffect, useState} from 'react';
import {defer, map, take, tap} from 'rxjs';
import {formatDate} from 'utils';
import listenbrainzApi from '../listenbrainzApi';
import listenbrainzSettings from '../listenbrainzSettings';

const serviceStartDate = '2015-09-17'; // ListenBrainz first launched.

export default function useHistoryStart() {
    const [startedAt, setStartedAt] = useState(listenbrainzSettings.firstScrobbledAt);
    const noStartDate = startedAt === '' || startedAt === serviceStartDate;

    useEffect(() => {
        if (noStartDate) {
            setStartedAt(serviceStartDate);
            const subscription = defer(() => listenbrainzApi.getListens({count: 1}))
                .pipe(
                    map(({payload}) => formatDate(Number(payload.oldest_listen_ts) * 1000)),
                    tap(
                        (firstScrobbledAt) =>
                            (listenbrainzSettings.firstScrobbledAt = firstScrobbledAt)
                    ),
                    take(1)
                )
                .subscribe(setStartedAt);
            return () => subscription.unsubscribe();
        }
    }, [noStartDate]);

    return startedAt;
}
