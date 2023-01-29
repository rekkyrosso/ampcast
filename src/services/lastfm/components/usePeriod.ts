import {useMemo} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';
import {LastFMPeriod} from './LastFmTopBrowser';

export default function usePeriod<T extends MediaObject>(
    source: MediaSource<T> | null,
    period: LastFMPeriod = 'overall'
) {
    const params = useMemo(() => ({period}), [period]);
    const pager = useSource(source, params);
    return pager;
}
