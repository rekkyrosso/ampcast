import {useMemo} from 'react';
import {getSourceFields, observeSourceFields} from 'services/mediaServices/servicesSettings';
import useObservable from 'hooks/useObservable';

export default function useMediaListFields(listId: string) {
    const observeFields = useMemo(() => () => observeSourceFields(listId), [listId]);
    const view = useObservable(observeFields, getSourceFields(listId));
    return view;
}
