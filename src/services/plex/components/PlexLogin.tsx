import React, {useEffect} from 'react';
import {Subject, map, mergeMap, tap, timer} from 'rxjs';
import DefaultLogin from 'components/Login/DefaultLogin';
import {refreshPin} from '../plexAuth';
import plex from '../plex';

export default function PlexLogin() {
    usePinRefresher();
    return <DefaultLogin service={plex} />;
}

function usePinRefresher() {
    useEffect(() => {
        const delay$ = new Subject<number>();
        const subscription = delay$
            .pipe(
                mergeMap((delay) => timer(delay)),
                mergeMap(() => refreshPin()),
                map((pin) => pin.expiresIn * 1000),
                tap((delay) => delay$.next(delay))
            )
            .subscribe();
        delay$.next(0);
        return () => subscription.unsubscribe();
    });
}
