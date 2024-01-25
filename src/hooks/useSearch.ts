import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import useSource from './useSource';

export default function useSearch<T extends MediaObject>(
    source: MediaSource<T> | null,
    q = ''
): Pager<T> | null {
    const params = useMemo(() => ({q}), [q]);
    const pager = useSource(source, params);
    return pager;
}
