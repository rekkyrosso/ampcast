import useFirstValue from 'hooks/useFirstValue';
import useHistory from './useHistory';

export default function useHistoryKey() {
    const {currentKey} = useHistory();
    const historyKey = useFirstValue(currentKey);
    return historyKey;
}
