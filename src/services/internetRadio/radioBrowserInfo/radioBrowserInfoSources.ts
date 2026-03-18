import FilterType from 'types/FilterType';
import ItemType from 'types/ItemType';
import MediaFilter from 'types/MediaFilter';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import countriesMap from 'services/countries';
import SimplePager from 'services/pagers/SimplePager';
import radioBrowserInfoApi from './radioBrowserInfoApi';
import RadioBrowserInfoPager from './RadioBrowserInfoPager';

const serviceId: MediaServiceId = 'internet-radio';

const radioBrowserInfoStationsLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Genre',
        h3: 'Country',
        data: 'Badges',
    },
    details: ['Name', 'Country', 'Genre', 'BitRate'],
};

const radioBrowserInfoStations: MediaSourceItems<MediaItem> = {
    layout: radioBrowserInfoStationsLayout,
};

export const radioBrowserInfoSearch: MediaSource<MediaItem> = {
    id: `${serviceId}/radio-browser.info/search`,
    title: 'Search',
    icon: 'search',
    itemType: ItemType.Media,
    filterType: FilterType.ByCountry,
    searchable: true,
    searchPlaceholder: 'Search radio-browser.info',
    primaryItems: radioBrowserInfoStations,

    search(country?: MediaFilter): Pager<MediaItem> {
        if (country) {
            return new RadioBrowserInfoPager(async (offset, limit) => {
                const items = await radioBrowserInfoApi.search(
                    country.q || '',
                    country.id,
                    offset,
                    limit
                );
                return {items};
            });
        } else {
            return new SimplePager();
        }
    },
};

export async function getRadioBrowserInfoFilters(
    filterType: FilterType
): Promise<readonly MediaFilter[]> {
    switch (filterType) {
        case FilterType.ByCountry: {
            const countries = await radioBrowserInfoApi.getCountries();
            return countries.map((country) => ({
                id: country.iso_3166_1,
                title: countriesMap.get(country.iso_3166_1) || country.name,
                count: country.stationcount,
            }));
        }

        default:
            throw Error('Not supported');
    }
}
