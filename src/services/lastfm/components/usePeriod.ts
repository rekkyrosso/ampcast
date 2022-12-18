import {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';
import {LastFMPeriod} from './LastFmTopBrowser';

export default function usePeriod<T extends MediaObject>(
    source: MediaSource<T> | null,
    period: LastFMPeriod = 'overall'
) {
    const [params, setParams] = useState<Record<string, LastFMPeriod>>();
    const pager = useSource(source, params);
    useEffect(() => setParams({period}), [period]);
    return pager;
}
