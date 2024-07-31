import {observePaused} from 'services/mediaPlayback/playback';
import useObservable from './useObservable';

export default function usePaused(): boolean {
    return useObservable(observePaused, true);
}
