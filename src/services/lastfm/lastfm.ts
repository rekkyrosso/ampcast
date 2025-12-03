import {Writable} from 'type-fest';
import ItemType from 'types/ItemType';
import Action from 'types/Action';
import DataService from 'types/DataService';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import ServiceType from 'types/ServiceType';
import actionsStore from 'services/actions/actionsStore';
import {getTextFromHtml} from 'utils';
import lastfmApi from './lastfmApi';
import {
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
} from './lastfmAuth';
import lastfmSettings from './lastfmSettings';
import {scrobble} from './lastfmScrobbler';
import lastfmSources, {lastfmScrobbles} from './lastfmSources';
import Credentials from './components/LastFmCredentials';
import Login from './components/LastFmLogin';

const serviceId: MediaServiceId = 'lastfm';

const lastfm: DataService = {
    id: serviceId,
    name: 'last.fm',
    icon: serviceId,
    url: 'https://www.last.fm',
    credentialsUrl: 'https://www.last.fm/api/account/create',
    serviceType: ServiceType.DataService,
    canScrobble: true,
    internetRequired: true,
    Components: {Credentials, Login},
    get credentialsLocked(): boolean {
        return lastfmSettings.credentialsLocked;
    },
    credentialsRequired: true,
    root: lastfmScrobbles,
    sources: lastfmSources,
    labels: {
        [Action.AddToLibrary]: 'Love on last.fm',
        [Action.RemoveFromLibrary]: 'Unlove on last.fm',
    },
    addMetadata,
    canStore,
    compareForRating,
    scrobble,
    store,
    observeConnecting,
    observeConnectionLogging,
    observeIsLoggedIn,
    isConnected,
    isLoggedIn,
    login,
    logout,
    reconnect,
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
