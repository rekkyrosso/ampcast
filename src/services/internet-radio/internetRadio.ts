import Action from 'types/Action';
import InternetRadio, {RadioItem} from 'types/InternetRadio';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import Pager from 'types/Pager';
import PlayableItem from 'types/PlayableItem';
import ServiceType from 'types/ServiceType';
import {exists} from 'utils';
import {t} from 'services/i18n';
import noAuth from 'services/mediaServices/noAuth';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import RadioBrowser from 'components/MediaBrowser/RadioBrowser';
import {getNowPlaying, observeNowPlaying} from './nowPlaying';
import {bulkStore, canStore, getFavoriteIds, store} from './storage';
import stations from './stations/all';

const serviceId: MediaServiceId = 'internet-radio';

const internetRadioFavorites: MediaSource<MediaItem> = {
    id: `${serviceId}/favorites`,
    title: t('Favorites'),
    icon: 'heart',
    itemType: ItemType.Media,
    Component: RadioBrowser,
    search(): Pager<RadioItem> {
        return new SimpleMediaPager(async () => getFavorites());
    },
};

const internetRadio: InternetRadio = {
    ...noAuth(true),
    id: serviceId,
    name: 'Internet Radio',
    icon: serviceId,
    url: '',
    serviceType: ServiceType.PublicMedia,
    internetRequired: true,
    defaultHidden: true,
    root: {
        id: `${serviceId}/stations`,
        title: 'Stations',
        icon: serviceId,
        itemType: ItemType.Media,
        Component: RadioBrowser,
        search(): Pager<RadioItem> {
            return new SimpleMediaPager(async () => getStations());
        },
    },
    sources: [internetRadioFavorites],
    labels: {
        [Action.AddToLibrary]: t('Add to Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Favorites'),
    },
    observeNowPlaying,
    canStore,
    compareForRating,
    getNowPlaying,
    getPlayableUrl,
    getStation,
    store,
    bulkStore,
};

export default internetRadio;

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function getPlayableUrl(item: PlayableItem): string {
    const [, , id] = item.src.split(':');
    const station = getStation(id);
    if (station) {
        return station.radio.stream;
    } else {
        throw Error('Station not found');
    }
}

function getFavorites(): readonly RadioItem[] {
    return getFavoriteIds().map(getStation).filter(exists);
}

function getStation(id: string): RadioItem | undefined {
    const station = stations.find((station) => station.radio.id === id);
    return station ? {...station, inLibrary: isFavorite(station)} : station;
}

function getStations(): readonly RadioItem[] {
    return stations.map((station) => getStation(station.radio.id)!);
}

function isFavorite(item: RadioItem): boolean {
    return getFavoriteIds().includes(item.radio.id);
}
