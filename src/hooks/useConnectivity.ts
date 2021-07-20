import {useEffect} from 'react';
import {Subscription} from 'rxjs';
import Auth from 'types/Auth';
import apple from 'services/apple/appleAuth';
import jellyfin from 'services/jellyfin';
import lastfm from 'services/lastfm';
import plex from 'services/plex';
import spotify from 'services/spotify';
import youtube from 'services/youtube';

const services: Record<string, Auth> = {
    apple,
    jellyfin,
    lastfm,
    plex,
    spotify,
    youtube,
};

export default function useConnectivity(): void {
    useEffect(() => {
        const subscriptions = new Subscription();
        Object.keys(services).forEach((name) => {
            const service = services[name];
            const subscription = service.observeIsLoggedIn().subscribe((isLoggedIn) => {
                document.body.classList.toggle(`${name}-connected`, isLoggedIn);
                document.body.classList.toggle(`${name}-not-connected`, !isLoggedIn);
            });
            subscriptions.add(subscription);
        });
        return () => subscriptions.unsubscribe();
    }, []);
}
