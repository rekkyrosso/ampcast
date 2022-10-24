import MediaItem from 'types/MediaItem';
import {PagerConfig} from 'types/Pager';
import listenbrainzSettings from './listenbrainzSettings';
import ListenBrainzPager from './ListenBrainzPager';

export default class ListenBrainzHistoryPager extends ListenBrainzPager<MediaItem> {
    constructor(params?: ListenBrainz.User.ListensParams, options?: PagerConfig) {
        const config = {pageSize: 50, ...options};
        super(
            `user/${listenbrainzSettings.userId}/listens`,
            ({payload}: ListenBrainz.User.Listens) => {
                const items = payload.listens;
                const atEnd = items.length < config.pageSize;
                const nextPageParams = atEnd ? undefined : {min_ts: items.at(-1)!.listened_at - 1};
                return {items, atEnd, nextPageParams};
            },
            params,
            config
        );
    }
}
