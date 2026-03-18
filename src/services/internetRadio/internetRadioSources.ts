import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource} from 'types/MediaSource';
import Pager from 'types/Pager';
import ObservablePager from 'services/pagers/ObservablePager';
import stationStore from './stationStore';

const serviceId: MediaServiceId = 'internet-radio';

const myStationsLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'IconTitle',
        h2: 'Genre',
        h3: 'Country',
        data: undefined,
    },
    details: ['IconTitle', 'Country', 'Genre', 'Description', 'BitRate'],
};

const myStations: MediaSource<MediaItem> = {
    id: `${serviceId}/my-stations`,
    title: 'My Stations',
    icon: 'heart',
    itemType: ItemType.Media,
    primaryItems: {layout: myStationsLayout},

    search(): Pager<MediaItem> {
        return new ObservablePager(stationStore.observeFavorites());
    },
};

const internetRadioSources: readonly AnyMediaSource[] = [myStations];

export default internetRadioSources;
