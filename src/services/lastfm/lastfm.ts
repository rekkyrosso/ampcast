import {Except, Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import Action from 'types/Action';
import DataService from 'types/DataService';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {getTextFromHtml} from 'utils';
import lastfmApi from './lastfmApi';
import {observeIsLoggedIn, isConnected, isLoggedIn, login, logout} from './lastfmAuth';
import LastFmPager from './LastFmPager';
import LastFmHistoryPager from './LastFmHistoryPager';
import lastfmSettings from './lastfmSettings';

const topTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'PlayCount'],
};

const lovedTracksLayout: MediaSourceLayout<MediaItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Artist', 'AlbumAndYear'],
};

const albumLayout: MediaSourceLayout<MediaAlbum> = {
    view: 'card compact',
    fields: ['Thumbnail', 'Title', 'Artist', 'Year', 'PlayCount'],
};

const artistLayout: MediaSourceLayout<MediaArtist> = {
    view: 'card minimal',
    fields: ['Thumbnail', 'Title', 'PlayCount'],
};

export const lastfmHistory: MediaSource<MediaItem> = {
    id: 'lastfm/history',
    title: 'History',
    icon: 'clock',
    itemType: ItemType.Media,

    search({startAt: to = 0}: {startAt?: number} = {}): Pager<MediaItem> {
        return new LastFmHistoryPager(to ? {to} : undefined);
    },
};

export const lastfmRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'lastfm/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,

    search(): Pager<MediaItem> {
        return new LastFmHistoryPager();
    },
};

const lastfmLovedTracks: MediaSource<MediaItem> = {
    id: 'lastfm/loved-tracks',
    title: 'Loved Tracks',
    icon: 'heart',
    itemType: ItemType.Media,
    lockActionsStore: true,
    layout: lovedTracksLayout,

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
    serviceType: ServiceType.DataService,
    canScrobble: true,
    defaultHidden: true,
    internetRequired: true,
    roots: [lastfmRecentlyPlayed],
    sources: [
        createTopView('user.getTopTracks', {
            title: 'Top Tracks',
            itemType: ItemType.Media,
            layout: topTracksLayout,
        }),
        createTopView('user.getTopAlbums', {
            title: 'Top Albums',
            itemType: ItemType.Album,
            layout: albumLayout,
        }),
        createTopView('user.getTopArtists', {
            title: 'Top Artists',
            itemType: ItemType.Artist,
            layout: artistLayout,
            secondaryLayout: albumLayout,
        }),
        lastfmLovedTracks,
        lastfmHistory,
    ],
    labels: {
        [Action.AddToLibrary]: 'Love on last.fm',
        [Action.RemoveFromLibrary]: 'Unlove on last.fm',
    },
    canRate: () => false,
    canStore,
    compareForRating,
    getMetadata,
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

async function getMetadata<T extends MediaObject>(item: T): Promise<T> {
    if (item.itemType !== ItemType.Media || item.inLibrary !== undefined) {
        return item;
    }
    const params: Record<string, string> = {
        method: 'track.getInfo',
        user: lastfmSettings.userId,
    };
    if (item.track_mbid) {
        params.mbid = item.track_mbid;
    } else {
        const {title, artists = []} = item;
        params.artist = artists[0];
        params.track = title;
        if (!params.artist) {
            return item;
        }
    }
    const {track} = await lastfmApi.get<LastFm.TrackInfoResponse>(params);
    if (!track || 'error' in track) {
        throw Error((track as any)?.message || 'Not found');
    } else {
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

function createTopView<T extends MediaObject>(
    method: string,
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: `lastfm/top/${method.slice(11).toLowerCase()}`,
        icon: 'star',
        searchable: false,

        search({period = 'overall'}: {period?: string} = {}): Pager<T> {
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
                }
            );
        },
    };
}
