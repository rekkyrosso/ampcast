import MediaItem from 'types/MediaItem';
import {Page, PagerConfig} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import {createRadioStation} from './radioBrowserInfoUtils';

export default class RadioBrowserInfoPager extends SequentialPager<MediaItem> {
    #pageNumber = 1;

    constructor(
        fetch: (offset: number, limit: number) => Promise<Page<RadioBrowserInfo.Station>>,
        options?: Partial<PagerConfig<MediaItem>>
    ) {
        super(
            async (limit: number): Promise<Page<MediaItem>> => {
                const offset = (this.#pageNumber - 1) * limit;
                const {items, total} = await fetch(offset, limit);
                this.#pageNumber++;
                return {
                    items: items.map((item) => createRadioStation(item)),
                    total,
                };
            },
            {pageSize: 100, ...options}
        );
    }
}
