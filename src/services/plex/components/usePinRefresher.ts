import {useEffect} from 'react';
import {Subject, map, mergeMap, tap, timer} from 'rxjs';
import {refreshPin} from '../plexAuth';

export default function usePinRefresher() {
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
