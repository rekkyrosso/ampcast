import {useCallback, useEffect, useMemo, useState} from 'react';
import {Subscription, map, merge, take} from 'rxjs';
import Pager from 'types/Pager';
import useSubject from './useSubject';

type FetchArgs = [index: number, length: number];

export interface PagerState<T> {
    items: readonly T[];
    size?: number | undefined;
    maxSize?: number | undefined;
    error: unknown;
    busy: boolean;
    loaded: boolean;
}

export default function usePager<T>(pager: Pager<T> | null) {
    const [fetch$, nextFetch] = useSubject<FetchArgs>();
    const [items, setItems] = useState<readonly T[]>([]);
    const [size, setSize] = useState<number | undefined>(undefined);
    const [maxSize, setMaxSize] = useState<number | undefined>(undefined);
    const [error, setError] = useState<unknown>();
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const state: PagerState<T> = useMemo(
        () => ({items, size, maxSize, error, busy, loaded}),
        [items, size, maxSize, error, busy, loaded]
    );

    const fetchAt = useCallback(
        (index: number, length: number) => {
            nextFetch([index, length]);
        },
        [nextFetch]
    );

    useEffect(() => {
        setItems([]);
        setSize(pager ? undefined : 0);
        setMaxSize(undefined);
        setError(undefined);
        setBusy(false);
        setLoaded(false);

        if (!pager) {
            return;
        }

        setMaxSize(pager.maxSize);

        const items$ = pager.observeItems();
        const size$ = pager.observeSize();
        const error$ = pager.observeError();
        const busy$ = pager.observeBusy();
        const loaded$ = merge(items$, error$).pipe(
            take(1),
            map(() => true)
        );

        const subscription = new Subscription();

        subscription.add(items$.subscribe(setItems));
        subscription.add(size$.subscribe(setSize));
        subscription.add(error$.subscribe(setError));
        subscription.add(busy$.subscribe(setBusy));
        subscription.add(loaded$.subscribe(setLoaded));
        subscription.add(
            fetch$.subscribe(([index, length]) => {
                pager.fetchAt(index, length);
            })
        );

        return () => subscription.unsubscribe();
    }, [pager, fetch$]);

    return [state, fetchAt] as const;
}
