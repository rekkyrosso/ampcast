import {useMemo} from 'react';
import {getSourceView, observeSourceView} from 'services/mediaServices/servicesSettings';
import useObservable from 'hooks/useObservable';

export default function useMediaListView(listId: string) {
    const observeView = useMemo(() => () => observeSourceView(listId), [listId]);
    const view = useObservable(observeView, getSourceView(listId));
    return view;
}
