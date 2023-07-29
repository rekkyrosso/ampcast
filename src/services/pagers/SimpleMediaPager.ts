import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SimpleMediaPager<T extends MediaObject> extends AbstractPager<T> {
    constructor(private readonly fetch: () => readonly T[]) {
        super();
    }

    fetchAt(index: 0): void;
    fetchAt(): void {
        if (!this.disconnected && !this.connected) {
            this.connect();
            const items = this.fetch();
            this.size = items.length;
            this.items = items;
        }
    }
}
