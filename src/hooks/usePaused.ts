import {observePaused} from 'services/mediaPlayback';
import useObservable from './useObservable';

export default function usePaused(): boolean {
    return useObservable(observePaused, true);
}
