import Action from 'types/Action';
import FilterType from 'types/FilterType';
import InternetRadio, {RadioItem} from 'types/InternetRadio';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import PlayableItem from 'types/PlayableItem';
import RadioStation from 'types/RadioStation';
import ServiceType from 'types/ServiceType';
import {exists} from 'utils';
import {t} from 'services/i18n';
import noAuth from 'services/mediaServices/noAuth';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import SimplePager from 'services/pagers/SimplePager';
import {getNowPlaying, observeNowPlaying} from './nowPlaying';
import {bulkStore, canStore, getFavoriteIds, store} from './storage';
import stations from './stations/all';
import FilterBrowser from 'components/MediaBrowser/FilterBrowser';

const serviceId: MediaServiceId = 'internet-radio';

const countryNames: Record<RadioStation['country'], string> = {
    '': '(none)',
    au: 'Australia',
    ca: 'Canada',
    ch: 'Switzerland',
    fr: 'France',
    ie: 'Ireland',
    pl: 'Poland',
    gb: 'United Kingdom',
    us: 'United States',
};

const defaultLayout: MediaSourceLayout<RadioItem> = {
    view: 'card',
    fields: ['Thumbnail', 'Title', 'Genre', 'Location'],
};

const favorites: MediaSource<RadioItem> = {
    id: `${serviceId}/favorites`,
    title: t('Favorites'),
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,
    search(): Pager<RadioItem> {
        return new SimpleMediaPager(async () => getFavorites());
    },
};

const byCountry: MediaSource<RadioItem> = {
    id: `${serviceId}/by-country`,
    title: 'By Country',
    icon: 'country',
    itemType: ItemType.Media,
    filterType: FilterType.ByCountry,
    Component: FilterBrowser,
    layout: {
        view: 'card',
        fields: ['Thumbnail', 'Title', 'Genre', 'Blurb'],
    },
    search(country?: MediaFilter): Pager<RadioItem> {
        if (country) {
            return new SimpleMediaPager(async () => getStationsByCountry(country.id));
        } else {
            return new SimplePager();
        }
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
        layout: defaultLayout,
        search(): Pager<RadioItem> {
            return new SimpleMediaPager(async () => getStations());
        },
    },
    sources: [favorites, byCountry],
    labels: {
        [Action.AddToLibrary]: t('Add to Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Favorites'),
    },
    observeNowPlaying,
    canStore,
    compareForRating,
    getFilters,
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

async function getFilters(filterType: FilterType): Promise<readonly MediaFilter[]> {
    switch (filterType) {
        case FilterType.ByCountry:
            return Object.keys(countryNames)
                .map((id) => ({
                    id,
                    title: countryNames[id as RadioStation['country']],
                }))
                .sort((a, b) => a.title.localeCompare(b.title));

        default:
            throw Error('Not supported');
    }
}

function getStation(id: string): RadioItem | undefined {
    const station = stations.find((station) => station.radio.id === id);
    return station ? {...station, inLibrary: isFavorite(station)} : station;
}

function getStations(): readonly RadioItem[] {
    const removeThe = (string: string) => string.replace(/^the\s+/i, '');
    return stations
        .map((station) => getStation(station.radio.id)!)
        .sort((a, b) => removeThe(a.title).localeCompare(removeThe(b.title)));
}

function getStationsByCountry(country: string): readonly RadioItem[] {
    return getStations().filter((station) => station.radio.country === country);
}

function isFavorite(item: RadioItem): boolean {
    return getFavoriteIds().includes(item.radio.id);
}
