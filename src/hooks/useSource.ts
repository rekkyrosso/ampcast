import {useLayoutEffect, useState} from 'react';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import SearchParams from 'types/SearchParams';
import {MediaSourceError} from 'services/errors';
import ErrorPager from 'services/pagers/ErrorPager';
import useSorting from './useSorting';

export default function useSource<T extends MediaObject>(
    source: MediaSource<T> | null,
    params?: SearchParams | MediaFilter | Record<string, unknown>
): Pager<T> | null {
    const [pager, setPager] = useState<Pager<T> | null>(null);
    const sort = useSorting(source?.id);

    useLayoutEffect(() => {
        try {
            const pager = source?.search(params, sort) || null;
            setPager(pager);
            return () => pager?.disconnect();
        } catch (err) {
            if (err instanceof MediaSourceError) {
                const pager = new ErrorPager<T>(err);
                setPager(pager);
            } else {
                throw err;
            }
        }
    }, [source, params, sort]);

    return pager;
}
