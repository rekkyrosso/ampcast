import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import Pager from 'types/Pager';
import {uniq} from 'utils';
import SimplePager from 'services/pagers/SimplePager';
import LastFmPager from './LastFmPager';
import LastFmHistoryPager from './LastFmHistoryPager';
import lastfmSettings from './lastfmSettings';
import LastFmHistoryBrowser from './components/LastFmHistoryBrowser';
import LastFmScrobblesBrowser from './components/LastFmScrobblesBrowser';
import {getDefaultLayout} from 'components/MediaList/layouts';

const serviceId: MediaServiceId = 'lastfm';

const lastfmHistory: MediaSource<MediaItem> = {
    id: `${serviceId}/history`,
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    Component: LastFmHistoryBrowser,

    search({startAt: to = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new LastFmHistoryPager('listens', to ? {to} : undefined);
    },
};

export const lastfmScrobbles: MediaSource<MediaItem> = {
    id: `${serviceId}/scrobbles`,
    title: 'Scrobbles',
    icon: 'clock',
    itemType: ItemType.Media,
    Component: LastFmScrobblesBrowser,

    search(): Pager<MediaItem> {
        // This doesn't get called (intercepted by `LastFmScrobblesBrowser`).
        return new SimplePager();
    },
};

const lastfmLovedTracks: MediaSource<MediaItem> = {
    id: `${serviceId}/loved-tracks`,
    title: 'Loved Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,

    search(): Pager<MediaItem> {
        return new LastFmPager(
            {
                method: 'user.getLovedTracks',
                user: lastfmSettings.userId,
            },
            ({lovedtracks}: any) => {
                const attr = lovedtracks['@attr'] || {};
                const track = lovedtracks.track;
                const items = track ? (Array.isArray(track) ? track : [track]) : [];
                const page = Number(attr.page) || 1;
                const totalPages = Number(attr.totalPages) || 1;
                const atEnd = totalPages === 1 || page === totalPages;
                const total = Number(attr.total) || undefined;
                return {items, total, atEnd, itemType: ItemType.Media};
            }
        );
    },
};

const lastfmSources = [
    createTopMultiSource<MediaItem>(ItemType.Media, 'Top Tracks', 'user.getTopTracks'),
    createTopMultiSource<MediaAlbum>(ItemType.Album, 'Top Albums', 'user.getTopAlbums'),
    createTopMultiSource<MediaArtist>(ItemType.Artist, 'Top Artists', 'user.getTopArtists'),
    lastfmLovedTracks,
    lastfmHistory,
];

export default lastfmSources;

function createTopMultiSource<T extends MediaObject>(
    itemType: T['itemType'],
    title: string,
    method: string
): MediaMultiSource<T> {
    const icon = 'star';
    const layout = addPlayCount(getDefaultLayout(itemType));
    const sourceProps: Except<MediaSource<T>, 'id' | 'search' | 'title'> = {
        icon,
        itemType,
        primaryItems: {layout},
    };
    return {
        id: `${serviceId}/top/${method.slice(11).toLowerCase()}`,
        title,
        icon,
        searchable: false,
        sources: [
            createTopSource<T>(method, '7day', {
                title: 'Week',
                ...sourceProps,
            }),
            createTopSource<T>(method, '1month', {
                title: 'Month',
                ...sourceProps,
            }),
            createTopSource<T>(method, '12month', {
                title: 'Year',
                ...sourceProps,
            }),
            createTopSource<T>(method, 'overall', {
                title: 'All time',
                ...sourceProps,
            }),
        ],
    } as unknown as MediaMultiSource<T>; // ಠ_ಠ
}

function createTopSource<T extends MediaObject>(
    method: string,
    period: 'overall' | '7day' | '1month' | '3month' | '6month' | '12month',
    props: Except<MediaSource<T>, 'id' | 'search'>
): MediaSource<T> {
    const sourceId = `${serviceId}/top/${method.slice(11).toLowerCase()}`;
    return {
        ...props,
        sourceId,
        id: `${sourceId}/${period}`,

        search(): Pager<T> {
            return new LastFmPager(
                {
                    method,
                    period,
                    user: lastfmSettings.userId,
                },
                (response: any) => {
                    const [, topType] = method.toLowerCase().split('.');
                    const result = response[topType.slice(3)];
                    const attr = result['@attr'];
                    const resultType = topType.slice(6, -1);
                    const items = result[resultType];
                    const page = Number(attr.page) || 1;
                    const totalPages = Number(attr.totalPages) || 1;
                    const atEnd = totalPages === 1 || page === totalPages;
                    const total = Number(attr.total) || undefined;
                    return {items, total, atEnd, itemType: props.itemType};
                },
                {maxSize: 1000}
            );
        },
    };
}

function addPlayCount(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        card: {...layout.card, data: 'PlayCount'},
        details: uniq([...layout.details, 'PlayCount']),
    };
}
