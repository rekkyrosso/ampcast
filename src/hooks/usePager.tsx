import {useCallback, useLayoutEffect, useState} from 'react';
import {debounceTime, Subscription} from 'rxjs';
import Pager from 'types/Pager';
import useSubject from './useSubject';

type FetchArgs = [index: number, length: number];

export interface PagerState<T> {
    items: readonly T[];
    size?: number | undefined;
    maxSize?: number | undefined;
    error: unknown;
    busy: boolean;
    complete: boolean;
    loaded: boolean;
}

const emptyState: PagerState<any> = {
    items: [],
    size: 0,
    maxSize: undefined,
    error: undefined,
    busy: false,
    complete: false,
    loaded: false,
};

export default function usePager<T>(pager: Pager<T> | null) {
    const [fetch$, nextFetch] = useSubject<FetchArgs>();
    const [state, setState] = useState<PagerState<T>>(emptyState);

    const fetchAt = useCallback(
        (index: number, length: number) => {
            nextFetch([index, length]);
        },
        [nextFetch]
    );

    useLayoutEffect(() => {
        setState({
            ...emptyState,
            size: pager ? undefined : 0,
            maxSize: pager?.maxSize,
        });

        if (pager) {
            const subscription = new Subscription();
            subscription.add(
                pager
                    .observeItems()
                    .pipe(debounceTime(1)) // Force async.
                    .subscribe((items) => {
                        setState((state) => ({...state, items, loaded: true}));
                    })
            );
            subscription.add(
                pager.observeSize().subscribe((size) => {
                    setState((state) => ({...state, size}));
                })
            );
            subscription.add(
                pager.observeError().subscribe((error) => {
                    setState((state) => ({...state, error, loaded: true}));
                })
            );
            subscription.add(
                pager.observeBusy().subscribe((busy) => {
                    setState((state) => ({...state, busy}));
                })
            );
            subscription.add(
                pager.observeComplete?.().subscribe(() => {
                    setState((state) => ({...state, complete: true}));
                })
            );
            subscription.add(
                fetch$.subscribe(([index, length]) => {
                    pager.fetchAt(index, length);
                })
            );
            return () => subscription.unsubscribe();
        }
    }, [pager, fetch$]);

    return [state, fetchAt] as const;
}
