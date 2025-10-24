import type {Subscription} from 'dexie';
import {liveQuery} from 'dexie';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import AbstractPager, {CreateChildPager} from './AbstractPager';

export default class DexiePager<T extends MediaObject> extends AbstractPager<T> {
    private subscription?: Subscription;

    constructor(
        private readonly query: () => Promise<readonly T[]>,
        options?: Partial<PagerConfig>,
        createChildPager?: CreateChildPager<T>
    ) {
        super({pageSize: Infinity, ...options}, createChildPager);
    }

    // Make public.
    get connected(): boolean {
        return super.connected;
    }

    // Make public.
    get disconnected(): boolean {
        return super.disconnected;
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
