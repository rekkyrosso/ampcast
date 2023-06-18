import {useCallback, useEffect, useMemo, useState} from 'react';
import {Subscription, concat, delay, map, merge, of, take} from 'rxjs';
import Pager from 'types/Pager';
import useSubject from './useSubject';

type FetchArgs = [index: number, length: number];

export interface PagerState<T> {
    items: readonly T[];
    size?: number | undefined;
    maxSize?: number | undefined;
    error: unknown;
    loaded: boolean;
}

export default function usePager<T>(pager: Pager<T> | null) {
    const [fetch$, nextFetch] = useSubject<FetchArgs>();
    const [items, setItems] = useState<readonly T[]>([]);
    const [size, setSize] = useState<number | undefined>(undefined);
    const [maxSize, setMaxSize] = useState<number | undefined>(undefined);
    const [error, setError] = useState<unknown>();
    const [loaded, setLoaded] = useState(false);
    const state: PagerState<T> = useMemo(
        () => ({items, size, maxSize, error, loaded}),
        [items, size, maxSize, error, loaded]
    );

    const fetchAt = useCallback(
        (index: number, length: number) => {
            nextFetch([index, length]);
        },
        [nextFetch]
    );

    useEffect(() => {
        setItems([]);
        setSize(undefined);
        setMaxSize(undefined);
        setError(undefined);
        setLoaded(false);

        if (!pager) {
            return;
        }

        const items$ = pager.observeItems();
        const size$ = pager.observeSize();
        const error$ = pager.observeError();
        const loaded$ = merge(items$, error$).pipe(
            take(1),
            map(() => true)
        );

        // Make sure we emit an empty array whenever we change pager.
        const flush$ = concat(of([]), of([]).pipe(delay(0)));

        const subscription = new Subscription();

        subscription.add(concat(flush$, items$).subscribe(setItems));
        subscription.add(size$.subscribe(setSize));
        subscription.add(error$.subscribe(setError));
        subscription.add(loaded$.subscribe(setLoaded));
        subscription.add(fetch$.subscribe(([index, length]) => {
            pager.fetchAt(index, length);
        }));

        setMaxSize(pager.maxSize);

        return () => subscription.unsubscribe();
    }, [pager, fetch$]);

    return [state, fetchAt] as const;
}
