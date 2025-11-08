import MediaObject from 'types/MediaObject';
import MediaPager from './MediaPager';

export default class SubjectPager<T extends MediaObject> extends MediaPager<T> {
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
