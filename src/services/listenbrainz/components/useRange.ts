import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';
import {ListenBrainzRange} from './ListenBrainzTopBrowser';

export default function useRange<T extends MediaObject>(
    source: MediaSource<T> | null,
    range: ListenBrainzRange = 'all_time'
) {
    const params = useMemo(() => ({range}), [range]);
    const pager = useSource(source, params);
    return pager;
}
