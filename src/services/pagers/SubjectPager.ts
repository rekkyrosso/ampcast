import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SubjectPager<T extends MediaObject> extends AbstractPager<T> {
    disconnect(): void {
        super.disconnect();
        this.items.forEach((item) => (item as any).pager?.disconnect());
    }

    fetchAt(): void {
        // do nothing
    }

    next(items: readonly T[]): void {
        if (this.disconnected) {
            return;
        }
        if (!this.subscriptions) {
            this.connect();
        }
        this.size$.next(items.length);
        this.items$.next(items);
    }
}
