import {useMemo} from 'react';
import {EMPTY, skip} from 'rxjs';
import SortParams from 'types/SortParams';
import {getSourceSorting, observeSourceSorting} from 'services/mediaServices/servicesSettings';
import useObservable from './useObservable';

export default function useSorting(listId = '', inactive?: boolean): SortParams | undefined {
    const observeSorting = useMemo(
        () => () => (inactive ? EMPTY : observeSourceSorting(listId).pipe(skip(1))),
        [listId, inactive]
    );
    const sorting = useObservable(observeSorting, getSourceSorting(listId));
    return sorting;
}
