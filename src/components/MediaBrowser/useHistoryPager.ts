import {useMemo} from 'react';
import MediaItem from 'types/MediaItem';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';

export default function useHistoryPager(source: MediaSource<MediaItem> | null, startAt = 0) {
    const params = useMemo(() => ({startAt}), [startAt]);
    const pager = useSource(source, params);
    return pager;
}
