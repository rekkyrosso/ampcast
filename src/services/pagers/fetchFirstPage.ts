import {map, race, timer} from 'rxjs';
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
        const items$ = pager.observeItems();
        const error$ = race(
            pager
                .observeError()
                .pipe(
                    map((error: any) =>
                        error instanceof Error ? error : Error(String(error?.message || 'unknown'))
                    )
                ),
            timer(timeout).pipe(map(() => Error('timeout')))
        );
        race(items$, error$).subscribe((result) => {
            if (!keepAlive) {
                pager.disconnect();
            }
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve(result);
            }
        });
        pager.fetchAt(0);
    });
}
