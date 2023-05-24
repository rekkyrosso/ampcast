import type {Observable} from 'rxjs';
import {BehaviorSubject, Subscription, combineLatest, filter, map, tap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import Pager from 'types/Pager';
import {Logger} from 'utils';
import {PageFetch} from './AbstractPager';

const logger = new Logger('DualPager');

export default class DualPager<T extends MediaObject> implements Pager<T> {
    private readonly fetches$ = new BehaviorSubject<PageFetch>({index: 0, length: 0});
    private subscriptions?: Subscription;
    private disconnected = false;

    constructor(private readonly topPager: Pager<T>, private readonly mainPager: Pager<T>) {}

    get maxSize(): number | undefined {
        return undefined;
    }

    observeItems(): Observable<readonly T[]> {
        return combineLatest([this.topPager.observeItems(), this.mainPager.observeItems()]).pipe(
            map(([topItems, mainItems]) => topItems.concat(mainItems))
        );
    }

    observeSize(): Observable<number> {
        return combineLatest([this.topPager.observeSize(), this.mainPager.observeSize()]).pipe(
            map(([topSize, mainSize]) => topSize + mainSize)
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

    fetchAt(index: number, length: number): void {
        if (this.disconnected) {
            logger.warn('disconnected');
            return;
        }
        if (!this.subscriptions) {
            this.connect();
        }
        this.fetches$.next({index, length});
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            this.subscriptions.add(
                combineLatest([this.topPager.observeSize(), this.observeFetches()])
                    .pipe(
                        tap(([topSize, fetch]) =>
                            this.mainPager.fetchAt(Math.max(fetch.index - topSize, 0), fetch.length)
                        )
                    )
                    .subscribe(logger)
            );
        }
    }

    private observeFetches(): Observable<PageFetch> {
        return this.fetches$.pipe(filter((fetch) => fetch.length > 0));
    }
}
