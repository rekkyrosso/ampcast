import {useEffect, useState} from 'react';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaSearchParams from 'types/MediaSearchParams';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import {MediaSourceError} from 'services/errors';
import ErrorPager from 'services/pagers/ErrorPager';

export default function useSource<T extends MediaObject>(
    source: MediaSource<T> | null,
    params?: MediaSearchParams | MediaFilter | Record<string, unknown>
): Pager<T> | null {
    const [pager, setPager] = useState<Pager<T> | null>(null);

    useEffect(() => {
        try {
            const pager = source?.search(params) || null;
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
    }, [source, params]);

    return pager;
}
