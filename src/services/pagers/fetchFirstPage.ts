import {merge, timer} from 'rxjs';
import {map, take, takeUntil} from 'rxjs/operators';
import Pager from 'types/Pager';

export interface FetchFirstPageOptions {
    readonly timeout?: number;
    readonly keepAlive?: boolean;
}

export default function fetchFirstPage<T>(
    pager: Pager<T>,
    {timeout = 5000, keepAlive = false}: FetchFirstPageOptions = {}
): Promise<readonly T[]> {
    return new Promise((resolve, reject) => {
        const complete = keepAlive ? undefined : () => pager.disconnect();
        const items$ = pager.observeItems();
        const error$ = merge(
            pager.observeError(),
            timer(timeout).pipe(map(() => Error('timeout')))
        );
        items$.pipe(takeUntil(error$), take(1)).subscribe({next: resolve, complete});
        error$.pipe(takeUntil(items$), take(1)).subscribe({next: reject, complete});
        pager.fetchAt(0);
    });
}
