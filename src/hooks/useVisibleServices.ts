import {getVisibleServices, observeVisibleServices} from 'services/mediaServices/servicesSettings';
import useObservable from './useObservable';

export default function useVisibleServices() {
    return useObservable(observeVisibleServices, getVisibleServices());
}
