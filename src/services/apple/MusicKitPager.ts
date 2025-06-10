import {mergeMap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {Logger} from 'utils';
import SequentialPager from 'services/pagers/SequentialPager';
import {addUserData} from './apple';
import {refreshToken} from './appleAuth';
import {createMediaObjects, MusicKitItem} from './musicKitUtils';

const logger = new Logger('MusicKitPager');

export interface MusicKitPage extends Page<MusicKitItem> {
    readonly nextPageUrl?: string | undefined;
}

export default class MusicKitPager<T extends MediaObject> extends SequentialPager<T> {
    private nextPageUrl: string | undefined = undefined;

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
        super(
            async (limit) => {
                try {
                    const response = await this.fetch(
                        this.nextPageUrl || href,
                        limit ? (params ? {...params, limit} : {limit}) : params
                    );
                    const result = toPage(response.data);
                    const items = createMediaObjects(result.items, this.parent);
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
            {pageSize: 100, ...options}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (!this.options?.lookup) {
                this.subscribeTo(
                    this.observeAdditions().pipe(
                        mergeMap((items) => addUserData(items, true, this.parent))
                    ),
                    logger
                );
            }
        }
    }

    private async fetch(href: string, params?: MusicKit.QueryParameters): Promise<any> {
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
