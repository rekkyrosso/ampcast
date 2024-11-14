import {useEffect} from 'react';
import {combineLatest, mergeMap, switchMap, tap} from 'rxjs';
import {observeMediaServices} from 'services/mediaServices';
import {observeIsOnLine} from 'services/online';

export default function useConnectivity(): void {
    useEffect(() => {
        const isOnLine$ = observeIsOnLine();
        const subscription = observeMediaServices()
            .pipe(
                switchMap((services) => services),
                mergeMap((service) =>
                    combineLatest([isOnLine$, service.observeIsLoggedIn()]).pipe(
                        tap(([isOnLine, isLoggedIn]) => {
                            const connected = service.internetRequired
                                ? isOnLine && isLoggedIn
                                : isLoggedIn;
                            document.body.classList.toggle(`${service.id}-connected`, connected);
                        })
                    )
                )
            )
            .subscribe();
        return () => subscription.unsubscribe();
    }, []);
}
