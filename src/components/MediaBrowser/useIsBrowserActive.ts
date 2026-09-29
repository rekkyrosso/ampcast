import useHistory from './useHistory';
import useHistoryKey from './useHistoryKey';

export default function useIsBrowserActive() {
    const {currentKey} = useHistory();
    const historyKey = useHistoryKey();
    return currentKey === historyKey;
}
