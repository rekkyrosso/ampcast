import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import {map, tap, take} from 'rxjs/operators';
import lastfmApi from 'services/lastfm/lastfmApi';
import lastfmSettings from 'services/lastfm/lastfmSettings';
import {formatDate} from 'utils';

const serviceStartDate = '2002-11-20';

export default function useHistoryStart() {
    const [startedAt, setStartedAt] = useState(() => lastfmSettings.firstScrobbledAt);
    const noStartDate = startedAt === '' || startedAt === serviceStartDate;

    useEffect(() => {
        if (noStartDate) {
            setStartedAt(serviceStartDate);
            const subscription = from(lastfmApi.getUserInfo())
                .pipe(
                    map((info) => formatDate(Number(info.user.registered.unixtime) * 1000)),
                    // TODO: The registration date may be later than the earliest scrobble.
                    tap((registeredAt) => (lastfmSettings.firstScrobbledAt = registeredAt)),
                    take(1)
                )
                .subscribe(setStartedAt);
            return () => subscription.unsubscribe();
        }
    }, [noStartDate]);

    return startedAt;
}
