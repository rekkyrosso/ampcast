import {useEffect} from 'react';
import {Subscription} from 'rxjs';
import mediaServices from 'services/mediaServices';

export default function useConnectivity(): void {
    useEffect(() => {
        const subscriptions = new Subscription();
        mediaServices.all.forEach((service) => {
            const subscription = service.observeIsLoggedIn().subscribe((isLoggedIn) => {
                document.body.classList.toggle(`${service.id}-connected`, isLoggedIn);
                document.body.classList.toggle(`${service.id}-not-connected`, !isLoggedIn);
            });
            subscriptions.add(subscription);
        });
        return () => subscriptions.unsubscribe();
    }, []);
}
