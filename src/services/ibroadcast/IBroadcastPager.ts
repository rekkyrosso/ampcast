import type {Observable} from 'rxjs';
import {mergeMap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import ibroadcastLibrary, {IBroadcastLibraryChange} from './ibroadcastLibrary';
import {createMediaObject} from './ibroadcastUtils';

const logger = new Logger('IBroadcastPager');

export default class IBroadcastPager<T extends MediaObject> extends IndexedPager<T> {
    private ids?: readonly number[];

    constructor(
        private readonly section: iBroadcast.LibrarySection,
        private readonly _fetchIds: () => Promise<readonly number[]>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>,
        private readonly _observeChanges?: () => Observable<IBroadcastLibraryChange<any>>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const library = await ibroadcastLibrary.load();
                if (!this.ids) {
                    this.ids = await _fetchIds();
                }
                return {
                    items: this.createItems(library, (pageNumber - 1) * pageSize, pageSize),
                    total: this.ids.length,
                };
            },
            {pageSize: 1000, ...options},
            createChildPager
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (this._observeChanges) {
                this.subscribeTo(
                    this._observeChanges().pipe(mergeMap((change) => this.refresh(change.library))),
                    logger
                );
            }
        }
    }

    protected createItem(library: iBroadcast.Library, id: number): T {
        return createMediaObject<T>(
            this.section,
            id,
            library,
            getSourceSorting(this.childSortId) || this.config.childSort
        );
    }

    private createItems(library: iBroadcast.Library, offset: number, count: number): readonly T[] {
        return this.ids!.slice(offset, offset + count).map((id) => this.createItem(library, id));
    }

    private async refresh(library: iBroadcast.Library): Promise<void> {
        // Only refresh if the view is completely loaded.
        if (this.size && this.size <= this.pageSize) {
            this.ids = await this._fetchIds();
            this.size = this.ids.length;
            this.items = this.createItems(library, 0, this.size);
        }
    }
}
