import type {Observable} from 'rxjs';
import {tap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import AbstractPager, {CreateChildPager} from './AbstractPager';

const logger = new Logger('ObservablePager');

export default class ObservablePager<T extends MediaObject> extends AbstractPager<T> {
    constructor(
        private readonly observable$: Observable<readonly T[]>,
        options?: Partial<PagerConfig>,
        createChildPager?: CreateChildPager<T>
    ) {
        super({pageSize: Infinity, ...options}, createChildPager);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.observable$.pipe(
                    tap({
                        next: (items) => {
                            this.size = items.length;
                            this.items = items;
                        },
                        error: (err) => {
                            this.error = err;
                        },
                    })
                ),
                logger
            );
        }
    }

    fetchAt(): void {
        this.connect();
    }
}
