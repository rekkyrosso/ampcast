import type {Observable} from 'rxjs';
import {Subscription, mergeMap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import Pager, {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {Logger} from 'utils';
import SequentialPager from 'services/pagers/SequentialPager';
import {addUserData} from './apple';
import {refreshToken} from './appleAuth';
import musicKitUtils, {MusicKitItem} from './musicKitUtils';

const logger = new Logger('MusicKitPager');

export interface MusicKitPage extends Page<MusicKitItem> {
    readonly nextPageUrl?: string | undefined;
}

export default class MusicKitPager<T extends MediaObject> implements Pager<T> {
    private readonly pager: SequentialPager<T>;
    private nextPageUrl: string | undefined = undefined;
    private subscriptions?: Subscription;

    private static defaultToPage(response: any): MusicKitPage {
        const result = response.data[0]?.relationships?.tracks || response;
        const items = result.data || [];
        const nextPageUrl = result.next;
        const total = result.meta?.total;
        return {items, total, nextPageUrl};
    }

    constructor(
        href: string,
        params?: MusicKit.QueryParameters,
        private readonly options?: Partial<PagerConfig>,
        private readonly parent?: ParentOf<T>,
        toPage = MusicKitPager.defaultToPage
    ) {
        this.pager = new SequentialPager<T>(
            async (limit: number): Promise<Page<T>> => {
                try {
                    const response = await this.fetchNext(
                        this.nextPageUrl || href,
                        limit ? (params ? {...params, limit} : {limit}) : params
                    );
                    const result = toPage(response.data);
                    const items = musicKitUtils.createItems(result.items, this.parent);
                    const total = result.total;
                    const atEnd = !result.nextPageUrl;
                    this.nextPageUrl = result.nextPageUrl;
                    return {items, total, atEnd};
                } catch (err: any) {
                    // Apple playlists return 404 if they are empty.
                    // If it's been deleted then it has no name/title.
                    if (
                        err.name === 'NOT_FOUND' &&
                        this.parent?.itemType === ItemType.Playlist &&
                        this.parent.title
                    ) {
                        return {items: [], total: 0, atEnd: true};
                    } else {
                        throw err;
                    }
                }
            },
            {pageSize: 25, ...options}
        );
    }

    get maxSize(): number | undefined {
        return this.pager.maxSize;
    }

    get pageSize(): number {
        return this.pager.pageSize;
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

    private connect(): void {
        if (!this.subscriptions) {
            this.subscriptions = new Subscription();

            if (!this.options?.lookup) {
                this.subscriptions.add(
                    this.pager
                        .observeAdditions()
                        .pipe(mergeMap((items) => addUserData(items, true, this.parent)))
                        .subscribe(logger)
                );
            }
        }
    }

    private async fetchNext(href: string, params?: MusicKit.QueryParameters): Promise<any> {
        const musicKit = MusicKit.getInstance();
        try {
            const response = await musicKit.api.music(href, params);
            return response;
        } catch (err: any) {
            const status = err?.data?.status;
            if (status === 401 || status === 403) {
                await refreshToken(); // this throws
                // We'll never get here.
                return musicKit.api.music(href, params);
            } else {
                throw err;
            }
        }
    }
}
