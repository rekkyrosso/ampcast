import MediaItem from 'types/MediaItem';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';

export default class IBroadcastPlaylistItemsPager extends SimpleMediaPager<MediaItem> {
    next(items: readonly MediaItem[]): void {
        if (!this.disconnected) {
            this.connect();
            this.size = items.length;
            this.items = items;
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        const prevItems = this.items;
        const srcsToRemove = removals.map((item) => item.src);
        const items = prevItems.filter((item) => !srcsToRemove.includes(item.src)) || [];
        this.next(items);
    }
}
