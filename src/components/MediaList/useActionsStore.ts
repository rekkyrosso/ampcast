import {useState, useEffect} from 'react';
import {delay, from, merge, of, timer} from 'rxjs';
import MediaSource from 'types/MediaSource';
import actionsStore from 'services/actions/actionsStore';
import {getServiceFromPath} from 'services/mediaServices';
import useHistory from 'components/MediaBrowser/useHistory';
import useFirstValue from 'hooks/useFirstValue';

export default function useActionsStore(
    source: MediaSource<any> | undefined,
    complete: boolean
): boolean {
    const [ready, setReady] = useState(false);
    const {currentKey, expire} = useHistory();
    const historyKey = useFirstValue(currentKey);
    const inactive = historyKey !== currentKey;

    useEffect(() => {
        const service = getServiceFromPath(source?.id || '');
        if (service && source?.lockActionType && !complete) {
            const itemType = source.itemType;
            const actionType = source.lockActionType;
            const unlock$ = actionsStore.isLocked(service, itemType, actionType)
                ? from(actionsStore.unlock(service, itemType, actionType)).pipe(delay(1_000))
                : of(undefined);
            const subscription = from(unlock$).subscribe(() => {
                actionsStore.lock(service, itemType, actionType);
                setReady(true);
            });
            return () => {
                subscription.unsubscribe();
                actionsStore.unlock(service, itemType, actionType);
            };
        }
        setReady(true);
    }, [source, complete]);

    useEffect(() => {
        const service = getServiceFromPath(source?.id || '');
        if (service && source?.lockActionType && ready && complete) {
            actionsStore.unlock(service, source.itemType, source.lockActionType);
        }
    }, [source, ready, complete]);

    useEffect(() => {
        const service = getServiceFromPath(source?.id || '');
        if (service && source?.lockActionType && inactive) {
            const subscription = merge(
                actionsStore.observeUnlock(service, source.itemType, source.lockActionType),
                timer(30_000)
            ).subscribe(() => {
                expire(historyKey);
            });
            return () => subscription.unsubscribe();
        }
    }, [source, inactive, expire, historyKey]);

    return ready;
}
