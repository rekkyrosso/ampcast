import type {Observable} from 'rxjs';
import {BehaviorSubject, Subscription, combineLatest} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import MediaObject from 'types/MediaObject';
import Pager from 'types/Pager';
import {Logger} from 'utils';

interface PageFetch {
    readonly index: number;
    readonly length?: number;
}

const logger = new Logger('DualPager');

export default class DualPager<T extends MediaObject> implements Pager<T> {
    protected readonly fetches$ = new BehaviorSubject<PageFetch>({index: 0});
    protected subscriptions?: Subscription;
    protected disconnected = false;

    constructor(private readonly topPager: Pager<T>, private readonly mainPager: Pager<T>) {}

    get maxSize(): number | undefined {
        return undefined;
    }

    observeItems(): Observable<readonly T[]> {
        return combineLatest([this.topPager.observeItems(), this.mainPager.observeItems()]).pipe(
            map(([topItems, items]) => topItems.concat(items))
        );
    }

    observeSize(): Observable<number> {
        return combineLatest([this.topPager.observeSize(), this.mainPager.observeSize()]).pipe(
            map(([topSize, size]) => topSize + size)
        );
    }

    observeError(): Observable<unknown> {
        return this.mainPager.observeError();
    }

    disconnect(): void {
        if (!this.disconnected) {
            this.disconnected = true;
            this.subscriptions?.unsubscribe();
            this.topPager.disconnect();
            this.mainPager.disconnect();
        }
    }

    fetchAt(index: number, length?: number): void {
        if (this.disconnected) {
            logger.warn('disconnected');
            return;
        }
        if (!this.subscriptions) {
            this.connect();
        }
        this.fetches$.next({index, length});
    }

    protected connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            this.subscriptions.add(
                combineLatest([this.topPager.observeSize(), this.fetches$])
                    .pipe(
                        tap(([size, fetch]) =>
                            this.mainPager.fetchAt(Math.min(fetch.index - size, 0), fetch.length)
                        )
                    )
                    .subscribe(logger)
            );
        }
    }
}
