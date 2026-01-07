import {useMemo} from 'react';
import {of} from 'rxjs';
import MediaService from 'types/MediaService';
import {isPersonalMediaService} from 'services/mediaServices';
import useObservable from './useObservable';

const FALSE = () => of(false);

export default function useIsLibraryLoading(service: MediaService): boolean {
    const observeLibraryLoading = useMemo(
        () => (isPersonalMediaService(service) ? service.observeIsLibraryLoading || FALSE : FALSE),
        [service]
    );

    return useObservable(
        observeLibraryLoading,
        isPersonalMediaService(service) ? service.isLibraryLoading || false : false
    );
}
