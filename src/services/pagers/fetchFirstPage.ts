import {merge, timer} from 'rxjs';
import {map, take, takeUntil} from 'rxjs/operators';
import Pager from 'types/Pager';

export default function fetchFirstPage<T>(pager: Pager<T>, timeout = 5000): Promise<readonly T[]> {
    return new Promise((resolve, reject) => {
        const complete = () => pager.disconnect();
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
