import {mergeMap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {exists, Logger} from 'utils';
import SequentialPager from 'services/pagers/SequentialPager';
import {spotifyApiCallWithRetry, SpotifyItem} from './spotifyApi';
import {addUserData, createMediaObject} from './spotifyUtils';

const logger = new Logger('SpotifyPager');

export interface SpotifyPage extends Page<SpotifyItem> {
    readonly next?: string | undefined;
}

export default class SpotifyPager<T extends MediaObject> extends SequentialPager<T> {
    static minPageSize = 10;
    static maxPageSize = 50;

    private pageNumber = 1;
    private cursor = '';

    constructor(
        fetch: (offset: number, limit: number, cursor: string) => Promise<SpotifyPage>,
        options?: Partial<PagerConfig>,
        inLibrary?: boolean | undefined
    ) {
        super(
            async (limit: number): Promise<Page<T>> => {
                const offset = (this.pageNumber - 1) * limit;
                const {items, total, next} = await spotifyApiCallWithRetry(() =>
                    fetch(offset, limit, this.cursor)
                );
                this.pageNumber++;
                this.cursor = next || '';
                return {
                    items: items.filter(exists).map((item) => createMediaObject(item, inLibrary)),
                    total,
                    atEnd: !next,
                };
            },
            {pageSize: SpotifyPager.maxPageSize, ...options}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (!this.passive) {
                this.subscribeTo(
                    this.observeAdditions().pipe(mergeMap((items) => addUserData(items))),
                    logger
                );
            }
        }
    }
}
