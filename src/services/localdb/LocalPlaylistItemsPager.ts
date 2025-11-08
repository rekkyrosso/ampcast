import {debounceTime, mergeMap, Subject} from 'rxjs';
import {PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import DexiePager from 'services/pagers/DexiePager';
import {LocalPlaylistItem} from './playlists';

const logger = new Logger('LocalPlaylistItemsPager');

export default class LocalPlaylistItemsPager extends DexiePager<LocalPlaylistItem> {
    private readonly synch$ = new Subject<number>();

    constructor(
        query: () => Promise<readonly LocalPlaylistItem[]>,
        private readonly synch: (items: readonly LocalPlaylistItem[]) => Promise<void>,
        options?: Partial<PagerConfig>
    ) {
        super(query, {passive: true, ...options});
    }

    removeItems(removals: readonly LocalPlaylistItem[]): void {
        const prevItems = this.items;
        const idsToRemove = removals.map((item) => item.id);
        const items = prevItems.filter((item) => !idsToRemove.includes(item.id)) || [];
        this.next(items);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.synch$.pipe(
                    debounceTime(500),
                    mergeMap(() => this.synch(this.items))
                ),
                logger
            );
        }
    }

    private next(items: readonly LocalPlaylistItem[]): void {
        this.size = items.length;
        this.items = items;
        this.synch$.next(performance.now());
    }
}
