import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import {filter, map, tap, take} from 'rxjs/operators';
import listenbrainzApi from 'services/listenbrainz/listenbrainzApi';
import listenbrainzSettings from 'services/listenbrainz/listenbrainzSettings';
import {exists} from 'utils';

const serviceStartDate = Date.UTC(2015, 8, 17);

export default function useHistoryStart() {
    const [startedAt, setStartedAt] = useState(listenbrainzSettings.firstScrobbledAt);
    const noStartDate = startedAt === 0 || startedAt === serviceStartDate;

    useEffect(() => {
        if (noStartDate) {
            setStartedAt(serviceStartDate);
            const subscription = from(listenbrainzApi.getListeningActivity())
                .pipe(
                    map((activities) => activities.find((activity) => activity.listen_count > 0)),
                    filter(exists),
                    // TODO: This just gets the first year.
                    map((activity) => Number(activity.from_ts) * 1000),
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
