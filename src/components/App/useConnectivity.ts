import {useEffect} from 'react';
import {Subscription, combineLatest} from 'rxjs';
import {getEnabledServices} from 'services/mediaServices';
import {observeIsOnLine} from 'services/online';

export default function useConnectivity(): void {
    useEffect(() => {
        const subscriptions = new Subscription();
        const isOnLine$ = observeIsOnLine();
        getEnabledServices().forEach((service) => {
            const subscription = combineLatest([isOnLine$, service.observeIsLoggedIn()]).subscribe(
                ([isOnLine, isLoggedIn]) => {
                    const connected = service.internetRequired
                        ? isOnLine && isLoggedIn
                        : isLoggedIn;
                    document.body.classList.toggle(`${service.id}-connected`, connected);
                    document.body.classList.toggle(`${service.id}-not-connected`, !connected);
                }
            );
            subscriptions.add(subscription);
        });
        return () => subscriptions.unsubscribe();
    }, []);
}
