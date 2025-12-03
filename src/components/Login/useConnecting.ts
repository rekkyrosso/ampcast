import {useMemo} from 'react';
import {EMPTY} from 'rxjs';
import MediaService from 'types/MediaService';
import useObservable from 'hooks/useObservable';

export default function useConnecting(service: MediaService) {
    const observeConnecting = useMemo(() => service.observeConnecting || (() => EMPTY), [service]);
    return useObservable(observeConnecting, false);
}
