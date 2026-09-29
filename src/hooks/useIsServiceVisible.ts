import {useMemo} from 'react';
import MediaService from 'types/MediaService';
import {isServiceVisible, observeServiceVisibility} from 'services/mediaServices/servicesSettings';
import useObservable from './useObservable';

export default function useIsServiceVisible(service: MediaService): boolean {
    const observeVisibility = useMemo(() => () => observeServiceVisibility(service), [service]);
    return useObservable(observeVisibility, isServiceVisible(service));
}
