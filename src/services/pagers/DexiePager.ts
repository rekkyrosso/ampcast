import type {Subscription} from 'dexie';
import {liveQuery} from 'dexie';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import MediaPager, {CreateChildPager} from './MediaPager';

export default class DexiePager<T extends MediaObject> extends MediaPager<T> {
    private subscription?: Subscription;

    constructor(
        private readonly query: () => Promise<readonly T[]>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>
    ) {
        super({pageSize: Infinity, ...options}, createChildPager);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscription = liveQuery(this.query).subscribe({
                next: (items) => {
                    this.size = items.length;
                    this.items = items;
                },
                error: (err) => {
                    this.error = err;
                },
            });
        }
    }

    disconnect(): void {
        if (!this.disconnected) {
            super.disconnect();
            this.subscription?.unsubscribe();
        }
    }

    fetchAt(): void {
        this.connect();
    }
}
