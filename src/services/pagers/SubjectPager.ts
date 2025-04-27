import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SubjectPager<T extends MediaObject> extends AbstractPager<T> {
    fetchAt(): void {
        // do nothing
    }

    async next(fetch: () => Promise<readonly T[]>): Promise<void> {
        if (!this.disconnected) {
            this.busy = true;
            try {
                this.connect();
                const items = await fetch();
                this.size = items.length;
                this.items = items;
            } catch (err) {
                this.error = err;
            }
            this.busy = false;
        }
    }
}
