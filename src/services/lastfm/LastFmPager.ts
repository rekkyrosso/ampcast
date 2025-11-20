import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import SequentialPager from 'services/pagers/SequentialPager';
import lastfmApi from './lastfmApi';
import {createMediaObjects} from './lastfmUtils';

export interface LastFmPage extends Page<LastFm.MediaObject> {
    readonly itemType: ItemType;
}

export interface LastFmPagerConfig<T> extends Partial<PagerConfig<T>> {
    readonly playCountName?: 'playcount' | 'userplaycount';
}

export default class LastFmPager<T extends MediaObject> extends SequentialPager<T> {
    static minPageSize = 10;
    static maxPageSize = 200;

    constructor(
        request: Record<string, string | number>,
        map: (response: any) => LastFmPage,
        options?: LastFmPagerConfig<T>,
        album?: LastFm.Album
    ) {
        const inLibrary = request.method === 'user.getLovedTracks' || undefined;
        const {page, ...params} = request;
        let pageNumber = Number(page) || 1;

        super(
            async (limit: number): Promise<Page<T>> => {
                const page = pageNumber;
                const result = await lastfmApi.get({...params, page, limit});
                const {items, total, atEnd, itemType} = map(result);
                pageNumber++;
                return {
                    items: createMediaObjects(
                        itemType,
                        items,
                        options?.playCountName,
                        album,
                        inLibrary
                    ),
                    total,
                    atEnd,
                };
            },
            {pageSize: 50, ...options}
        );
    }
}
