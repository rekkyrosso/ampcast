import {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';
import {ListenBrainzRange} from './ListenBrainzTopBrowser';

export default function useRange<T extends MediaObject>(
    source: MediaSource<T> | null,
    range: ListenBrainzRange = 'all_time'
) {
    const [params, setParams] = useState<Record<string, ListenBrainzRange>>();
    const pager = useSource(source, params);
    useEffect(() => setParams({range}), [range]);
    return pager;
}
