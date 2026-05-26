import {useMemo} from 'react';
import SortParams from 'types/SortParams';
import {getSourceSorting, observeSourceSorting} from 'services/mediaServices/servicesSettings';
import useObservable from './useObservable';

export default function useSorting(listId = ''): SortParams | undefined {
    const observeSorting = useMemo(() => () => observeSourceSorting(listId), [listId]);
    const sorting = useObservable(observeSorting, getSourceSorting(listId));
    return sorting;
}
