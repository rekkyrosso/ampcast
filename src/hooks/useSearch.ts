import {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from './useSource';

export default function useSearch<T extends MediaObject>(source: MediaSource<T> | null, q = '') {
    const [params, setParams] = useState<Record<string, string>>();
    const pager = useSource(source, params);
    useEffect(() => setParams({q}), [q]);
    return pager;
}
