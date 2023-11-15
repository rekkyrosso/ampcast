import {observeIsOnLine, isOnLine} from 'services/online';
import useObservable from './useObservable';

export default function useIsOnLine(): boolean {
    return useObservable(observeIsOnLine, isOnLine());
}
