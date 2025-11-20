import MediaObject from 'types/MediaObject';
import MediaPager from './MediaPager';

export default class SubjectPager<T extends MediaObject> extends MediaPager<T> {
    constructor() {
        super({pageSize: Infinity});
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
