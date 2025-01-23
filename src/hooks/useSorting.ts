import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import {getSourceSorting, observeSourceSorting} from 'services/mediaServices/servicesSettings';
import useObservable from './useObservable';

export default function useSorting<T extends MediaObject>(source: MediaSource<T>) {
    const observeSorting = useMemo(() => () => observeSourceSorting(source), [source]);
    const {sortBy, sortOrder} = useObservable(observeSorting, getSourceSorting(source));
    return {sortBy, sortOrder};
}
