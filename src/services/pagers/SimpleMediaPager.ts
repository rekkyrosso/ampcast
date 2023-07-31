import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SimpleMediaPager<T extends MediaObject> extends AbstractPager<T> {
    constructor(private readonly fetch: () => Promise<readonly T[]>) {
        super();
    }

    fetchAt(index: 0): void;
    fetchAt(): void {
        if (!this.disconnected && !this.connected) {
            this.connect();
            this.fetch()
                .then((items) => {
                    this.size = items.length;
                    this.items = items;
                })
                .catch((error) => (this.error = error));
        }
    }
}
