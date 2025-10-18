import {tap, type Observable} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {Logger} from 'utils';
import AbstractPager from './AbstractPager';

const logger = new Logger('ObservablePager');

export default class ObservablePager<T extends MediaObject> extends AbstractPager<T> {
    constructor(private readonly observable$: Observable<readonly T[]>) {
        super({pageSize: Infinity});
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.observable$.pipe(
                    tap((items) => {
                        this.size = items.length;
                        this.items = items;
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
