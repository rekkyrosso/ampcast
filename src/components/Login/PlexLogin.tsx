import React, {useEffect} from 'react';
import {Subject, timer} from 'rxjs';
import {map, mergeMap, tap} from 'rxjs/operators';
import plex from 'services/plex';
import {refreshPin} from 'services/plex/plexAuth';
import DefaultLogin from './DefaultLogin';

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
