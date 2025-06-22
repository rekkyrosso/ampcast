import {Except, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import Action from 'types/Action';
import DataService from 'types/DataService';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaSource, {MediaMultiSource} from 'types/MediaSource';
import Pager from 'types/Pager';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {isStartupService} from 'services/buildConfig';
import SimplePager from 'services/pagers/SimplePager';
import {getTextFromHtml} from 'utils';
import lastfmApi from './lastfmApi';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './lastfmAuth';
import LastFmPager from './LastFmPager';
import LastFmHistoryPager from './LastFmHistoryPager';
import lastfmSettings from './lastfmSettings';
import {scrobble} from './lastfmScrobbler';
import LastFmHistoryBrowser from './components/LastFmHistoryBrowser';
import LastFmScrobblesBrowser from './components/LastFmScrobblesBrowser';
import Credentials from './components/LastFmCredentials';
import Login from './components/LastFmLogin';

const lastfmHistory: MediaSource<MediaItem> = {
    id: 'lastfm/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,
    Component: LastFmHistoryBrowser,

    search({startAt: to = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new LastFmHistoryPager('listens', to ? {to} : undefined);
    },
};

const lastfmScrobbles: MediaSource<MediaItem> = {
    id: 'lastfm/scrobbles',
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
    id: 'lastfm/loved-tracks',
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

const lastfm: DataService = {
    id: 'lastfm',
    name: 'last.fm',
    icon: 'lastfm',
    url: 'https://www.last.fm',
    credentialsUrl: 'https://www.last.fm/api/account/create',
    serviceType: ServiceType.DataService,
    canScrobble: true,
    defaultHidden: !isStartupService('lastfm'),
    internetRequired: true,
    Components: {Credentials, Login},
    get credentialsLocked(): boolean {
        return lastfmSettings.credentialsLocked;
    },
    credentialsRequired: true,
    root: lastfmScrobbles,
    sources: [
        createTopMultiSource<MediaItem>(ItemType.Media, 'Top Tracks', 'user.getTopTracks'),
        createTopMultiSource<MediaAlbum>(ItemType.Album, 'Top Albums', 'user.getTopAlbums'),
        createTopMultiSource<MediaArtist>(ItemType.Artist, 'Top Artists', 'user.getTopArtists'),
        lastfmLovedTracks,
        lastfmHistory,
    ],
    labels: {
        [Action.AddToLibrary]: 'Love on last.fm',
        [Action.RemoveFromLibrary]: 'Unlove on last.fm',
    },
    addMetadata,
    canStore,
    compareForRating,
    scrobble,
    store,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
};

export default lastfm;

function canStore<T extends MediaObject>(item: T): boolean {
    return item.itemType === ItemType.Media && !!item.title && !!item.artists?.[0];
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    const [aService] = a.src.split(':');
    const [bService] = b.src.split(':');

    if (aService !== bService) {
        return false;
    }

    switch (a.itemType) {
        case ItemType.Media:
            return (
                a.itemType === b.itemType &&
                !!a.title &&
                !!a.artists?.[0] &&
                compareString(a.title, b.title) &&
                compareString(a.artists?.[0], b.artists?.[0])
            );

        default:
            return false;
    }
}

function compareString(a: string, b = ''): boolean {
    return a.localeCompare(b, undefined, {sensitivity: 'accent'}) === 0;
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (item.itemType !== ItemType.Media || item.inLibrary !== undefined) {
        return item;
    }
    const {title, artists: [artist] = []} = item;
    const track = await lastfmApi.getTrackInfo(title, artist, lastfmSettings.userId);
    if (track) {
        const metadata: Partial<Writable<MediaItem>> = {};
        const {album, wiki} = track;
        if (album) {
            metadata.album = album.title;
            metadata.albumArtist = album.artist;
            if (!item.thumbnails) {
                metadata.thumbnails = lastfmApi.createThumbnails(album.image);
            }
        }
        if (!item.description && wiki) {
            metadata.description = getTextFromHtml(wiki.content || wiki.summary);
        }
        if (!item.year && wiki) {
            metadata.year = wiki.published
                ? new Date(wiki.published).getFullYear() || undefined
                : undefined;
        }
        return {
            ...item,
            ...metadata,
            inLibrary: actionsStore.getInLibrary(item, !!Number(track.userloved)),
            playCount: Number(track.userplaycount) || 0,
            globalPlayCount: Number(track.playcount) || 0,
        };
    }
    return item;
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    if (item.itemType === ItemType.Media) {
        const {title: track, artists = []} = item;
        const artist = artists[0];
        if (track && artist) {
            await lastfmApi.post({
                method: inLibrary ? 'track.love' : 'track.unlove',
                track,
                artist,
            });
        }
    }
}

function createTopMultiSource<T extends MediaObject>(
    itemType: T['itemType'],
    title: string,
    method: string
): MediaMultiSource<T> {
    const icon = 'star';
    const sourceProps: Except<MediaSource<T>, 'id' | 'search' | 'title'> = {
        icon,
        itemType,
    };
    return {
        id: `lastfm/top/${method.slice(11).toLowerCase()}`,
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
    return {
        ...props,
        id: `lastfm/top/${method.slice(11).toLowerCase()}/${period}`,

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
