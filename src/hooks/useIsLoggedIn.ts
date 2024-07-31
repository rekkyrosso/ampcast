import MediaService from 'types/MediaService';
import useObservable from './useObservable';

export default function useIsLoggedIn(service: MediaService): boolean {
    return useObservable(service.observeIsLoggedIn, service.isLoggedIn());
}
