import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SimpleMediaPager<T extends MediaObject> extends AbstractPager<T> {
    constructor(private readonly fetch: () => Promise<readonly T[]>) {
        super({pageSize: Infinity});
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
