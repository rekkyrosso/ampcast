import {useEffect, useState} from 'react';
import {map} from 'rxjs/operators';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import useSubject from './useSubject';

export default function useSearch<T extends MediaObject>(
    source: MediaSource<T> | null,
    query = ''
) {
    const [query$, nextQuery] = useSubject<string>();
    const [pager, setPager] = useState<Pager<T> | null>(null);

    useEffect(() => {
        if (source) {
            const subscription = query$.pipe(map((q) => source.search(q))).subscribe(setPager);
            return () => subscription.unsubscribe();
        } else {
            setPager(null);
        }
    }, [source, query$]);

    useEffect(() => nextQuery(query), [query, source, nextQuery]);

    return pager;
}
