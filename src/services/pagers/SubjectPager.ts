import MediaObject from 'types/MediaObject';
import AbstractPager from './AbstractPager';

export default class SubjectPager<T extends MediaObject> extends AbstractPager<T> {
    fetchAt(): void {
        // do nothing
    }

    async next(fetch: () => Promise<readonly T[]>): Promise<void> {
        if (!this.disconnected) {
            try {
                this.connect();
                this.busy = true;
                const items = await fetch();
                this.size = items.length;
                this.items = items;
                this.busy = false;
            } catch (err) {
                this.error = err;
                this.busy = false;
            }
        }
    }
}
