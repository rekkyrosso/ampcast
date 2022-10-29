import {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import {LastFMPeriod} from './LastFmTopBrowser';

export default function usePeriod<T extends MediaObject>(
    source: MediaSource<T> | null,
    period: LastFMPeriod = 'overall'
) {
    const [pager, setPager] = useState<Pager<T> | null>(null);

    useEffect(() => {
        setPager(source?.search({period}) || null);
    }, [source, period]);

    return pager;
}
