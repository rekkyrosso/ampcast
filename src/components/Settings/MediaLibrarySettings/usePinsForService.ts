import {useMemo} from 'react';
import {map} from 'rxjs';
import MediaService from 'types/MediaService';
import Pin from 'types/Pin';
import pinStore from 'services/pins/pinStore';
import useObservable from 'hooks/useObservable';

export default function usePinsForService(service: MediaService): readonly Pin[] {
    const observePinsForService = useMemo(
        () => () =>
            pinStore.observePinsForService(service.id).pipe(map((pins) => filterPins(pins))),
        [service]
    );
    return useObservable(observePinsForService, filterPins(pinStore.getPinsForService(service.id)));
}

function filterPins(pins: readonly Pin[]): readonly Pin[] {
    return pins.filter((pin) => pinStore.isPinned(pin.src));
}
