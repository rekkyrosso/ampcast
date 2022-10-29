import {useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import {ListenBrainzRange} from './ListenBrainzTopBrowser';

export default function useRange<T extends MediaObject>(
    source: MediaSource<T> | null,
    range: ListenBrainzRange = 'all_time'
) {
    const [pager, setPager] = useState<Pager<T> | null>(null);

    useEffect(() => {
        setPager(source?.search({range}) || null);
    }, [source, range]);

    return pager;
}
