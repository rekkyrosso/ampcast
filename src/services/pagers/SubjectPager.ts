import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SubjectPager<T extends MediaObject> extends AbstractPager<T> {
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
