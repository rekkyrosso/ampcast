import {useEffect} from 'react';
import {Subscription} from 'rxjs';
import {getAllServices} from 'services/mediaServices';

export default function useConnectivity(): void {
    useEffect(() => {
        const subscriptions = new Subscription();
        getAllServices().forEach((service) => {
            const subscription = service.observeIsLoggedIn().subscribe((isLoggedIn) => {
                document.body.classList.toggle(`${service.id}-connected`, isLoggedIn);
                document.body.classList.toggle(`${service.id}-not-connected`, !isLoggedIn);
            });
            subscriptions.add(subscription);
        });
        return () => subscriptions.unsubscribe();
    }, []);
}
