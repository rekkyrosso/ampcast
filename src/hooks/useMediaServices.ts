import {useEffect} from 'react';
import {getServices, loadMediaServices, observeMediaServices} from 'services/mediaServices';
import useObservable from './useObservable';

export default function useMediaServices() {
    useEffect(() => {
        loadMediaServices();
    }, []);

    return useObservable(observeMediaServices, getServices());
}
