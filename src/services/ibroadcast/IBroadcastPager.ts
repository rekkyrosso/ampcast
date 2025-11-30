import type {Observable} from 'rxjs';
import {mergeMap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {Logger} from 'utils';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/MediaPager';
import SequentialPager from 'services/pagers/SequentialPager';
import ibroadcastLibrary, {IBroadcastLibraryChange} from './ibroadcastLibrary';
import {createMediaObject} from './ibroadcastUtils';

const logger = new Logger('IBroadcastPager');

export default class IBroadcastPager<T extends MediaObject> extends SequentialPager<T> {
    constructor(
        private readonly section: iBroadcast.LibrarySection,
        private readonly _fetchIds: () => Promise<readonly number[]>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>,
        private readonly _observeChanges?: () => Observable<IBroadcastLibraryChange<any>>
    ) {
        super(
            async () => {
                const library = await ibroadcastLibrary.load();
                const ids = await _fetchIds();
                return {
                    items: this.createItems(library, ids),
                    total: ids.length,
                    atEnd: true,
                };
            },
            {pageSize: Infinity, ...options},
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

    protected createItem(library: iBroadcast.Library, id: number, index: number): T;
    protected createItem(library: iBroadcast.Library, id: number): T {
        return createMediaObject<T>(
            this.section,
            id,
            library,
            getSourceSorting(this.childSortId) || this.config.childSort
        );
    }

    private createItems(library: iBroadcast.Library, ids: readonly number[]): readonly T[] {
        return ids.map((id, index) => this.createItem(library, id, index));
    }

    private async refresh(library: iBroadcast.Library): Promise<void> {
        const ids = await this._fetchIds();
        this.size = ids.length;
        this.items = this.createItems(library, ids);
    }
}
