import {useMemo} from 'react';
import MediaService from 'types/MediaService';
import Pin from 'types/Pin';
import pinStore from 'services/pins/pinStore';
import useObservable from 'hooks/useObservable';

export default function usePinsForService(service: MediaService): readonly Pin[] {
    const observePinsForService = useMemo(
        () => () => pinStore.observePinsForService(service.id),
        [service]
    );
    return useObservable(observePinsForService, pinStore.getPinsForService(service.id));
}
