import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import MediaPager, {CreateChildPager} from './MediaPager';

export default class SubjectPager<T extends MediaObject> extends MediaPager<T> {
    constructor(options?: Partial<PagerConfig<T>>, createChildPager?: CreateChildPager<T>) {
        super({pageSize: Infinity, ...options}, createChildPager);
    }

    fetchAt(): void {
        // do nothing
    }

    next(items: readonly T[]): void {
        if (!this.disconnected) {
            this.connect();
            this.size = items.length;
            this.items = items;
        }
    }
}
