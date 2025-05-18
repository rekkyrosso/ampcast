import type {Observable} from 'rxjs';
import {Subscription, mergeMap} from 'rxjs';
import MediaAlbum from 'types/MediaAlbum';
import MediaObject from 'types/MediaObject';
import Pager, {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {Logger} from 'utils';
import OffsetPager from 'services/pagers/OffsetPager';
import plexApi, {PlexRequest} from './plexApi';
import plexMediaType from './plexMediaType';
import plexSettings from './plexSettings';
import plexUtils from './plexUtils';

const logger = new Logger('PlexPager');

export default class PlexPager<T extends MediaObject> implements Pager<T> {
    static minPageSize = 10;
    static plexMaxPageSize = 1000;

    private readonly pager: OffsetPager<T>;
    readonly pageSize: number;
    private subscriptions?: Subscription;

    constructor(
        private readonly request: PlexRequest,
        private readonly options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>
    ) {
        let pageSize = options?.pageSize;
        if (!pageSize) {
            pageSize = plexSettings.connection?.local ? PlexPager.plexMaxPageSize : 200;
        }
        this.pageSize = Math.min(options?.maxSize || Infinity, pageSize);
        const config = {...options, pageSize: this.pageSize};
        this.pager = new OffsetPager<T>((pageNumber) => this.fetch(pageNumber), config);
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    observeBusy(): Observable<boolean> {
        return this.pager.observeBusy();
    }

    observeItems(): Observable<readonly T[]> {
        return this.pager.observeItems();
    }

    observeSize(): Observable<number> {
        return this.pager.observeSize();
    }

    observeError(): Observable<unknown> {
        return this.pager.observeError();
    }

    disconnect(): void {
        this.pager.disconnect();
        this.subscriptions?.unsubscribe();
    }

    fetchAt(index: number, length: number): void {
        if (!this.subscriptions) {
            this.connect();
        }

        this.pager.fetchAt(index, length);
    }

    private get isLookup(): boolean {
        return !!this.options?.lookup;
    }

    private get isSearch(): boolean {
        const {path, params} = this.request;
        return (
            path.endsWith('/all') &&
            !!(params?.title || params?.originalTitle) &&
            params.type !== plexMediaType.Playlist &&
            !params.extraType
        );
    }

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            // Items from the `/search` endpoints are already enhanced.
            if (!this.isLookup) {
                this.subscriptions.add(
                    this.pager
                        .observeAdditions()
                        .pipe(mergeMap((items) => plexUtils.enhanceItems(items, this.parent)))
                        .subscribe(logger)
                );
            }
        }
    }

    private async fetch(pageNumber: number): Promise<Page<T>> {
        const {headers, ...rest} = this.request;
        const request = {
            ...rest,
            headers: {
                ...headers,
                'X-Plex-Container-Size': String(this.pageSize),
                'X-Plex-Container-Start': String((pageNumber - 1) * this.pageSize),
            },
        };
        let plexItems: readonly plex.MediaObject[];
        let albums: readonly MediaAlbum[] = [];
        let total = 0;
        if (this.isSearch && pageNumber === 1) {
            const page = await plexApi.search(request);
            plexItems = page.items;
            total = page.total || plexItems.length;
        } else {
            const {
                MediaContainer: {Metadata = [], size, totalSize},
            } = await plexApi.fetchJSON<plex.MetadataResponse>(request);
            plexItems = Metadata;
            total = totalSize || size;
        }
        if (this.isLookup) {
            [plexItems, albums] = await Promise.all([
                plexApi.getMetadata(plexItems.map((item) => item.ratingKey)),
                plexUtils.getMediaAlbums(plexItems),
            ]);
        }
        const items = plexUtils.createMediaObjects<T>(plexItems, this.parent, albums);
        return {items, total};
    }
}
