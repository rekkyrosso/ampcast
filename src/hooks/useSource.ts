import {useEffect, useState} from 'react';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';

export default function useSource<T extends MediaObject>(
    source: MediaSource<T> | null,
    params?: MediaFilter | Record<string, unknown>
): Pager<T> | null {
    const [pager, setPager] = useState<Pager<T> | null>(null);

    useEffect(() => {
        const pager = source?.search(params) || null;
        setPager(pager);
        return () => pager?.disconnect();
    }, [source, params]);

    return pager;
}
