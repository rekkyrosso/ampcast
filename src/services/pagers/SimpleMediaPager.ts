import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import MediaPager, {CreateChildPager} from './MediaPager';

export default class SimpleMediaPager<T extends MediaObject> extends MediaPager<T> {
    constructor(
        private readonly fetch: () => Promise<readonly T[]>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>
    ) {
        super({pageSize: Infinity, ...options}, createChildPager);
    }

    fetchAt(index: 0): void;
    fetchAt(): void {
        if (!this.disconnected && !this.connected) {
            this.connect();
            this.busy = true;
            this.fetch()
                .then((items) => {
                    this.size = items.length;
                    this.items = items;
                    this.busy = false;
                })
                .catch((error) => {
                    this.error = error;
                    this.busy = false;
                });
        }
    }
}
