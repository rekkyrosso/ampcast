import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSearchParams from 'types/MediaSearchParams';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import useSource from './useSource';

export default function useSearch<T extends MediaObject>(
    source: MediaSource<T> | null,
    q: MediaSearchParams['q'] = '',
    sortBy?: MediaSearchParams['sortBy'],
    sortOrder?: MediaSearchParams['sortOrder']
): Pager<T> | null {
    const params: MediaSearchParams = useMemo(
        () => ({q, sortBy, sortOrder}),
        [q, sortBy, sortOrder]
    );
    const pager = useSource(source, params);
    return pager;
}
