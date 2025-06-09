import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import SearchParams from 'types/SearchParams';
import useSource from './useSource';

export default function useSearch<T extends MediaObject>(
    source: MediaSource<T> | null,
    q: SearchParams['q'] = ''
): Pager<T> | null {
    const params: SearchParams = useMemo(() => ({q}), [q]);
    const pager = useSource(source, params);
    return pager;
}
