import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SimpleMediaPager<T extends MediaObject> extends AbstractPager<T> {
    constructor(private readonly fetch: () => readonly T[]) {
        super();
    }

    fetchAt(index: 0): void;
    fetchAt(): void {
        if (!this.disconnected && !this.subscriptions) {
            this.connect();
            const items = this.fetch();
            this.size$.next(items.length);
            this.items$.next(items);
        }
    }

    disconnect(): void {
        super.disconnect();
        this.items.forEach((item) => (item as any).pager?.disconnect());
    }
}
