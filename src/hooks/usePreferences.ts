import preferences, {observePreferences} from 'services/preferences';
import useObservable from './useObservable';

export default function usePreferences() {
    return useObservable(observePreferences, {...preferences});
}
