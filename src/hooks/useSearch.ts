import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from './useSource';

export default function useSearch<T extends MediaObject>(source: MediaSource<T> | null, q = '') {
    const params = useMemo(() => ({q}), [q]);
    const pager = useSource(source, params);
    return pager;
}
