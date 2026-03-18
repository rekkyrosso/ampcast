import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';
import {scrobble} from './internetRadioScrobbler';
import {radioBrowserInfoSearch, getRadioBrowserInfoFilters} from './radioBrowserInfo';
import internetRadioSources from './internetRadioSources';
import CreateStationDialog from './components/CreateStationDialog';
import EditStationDialog from './components/EditStationDialog';
import ManageStations from './components/ManageStations';

const serviceId: MediaServiceId = 'internet-radio';

const internetRadio: PublicMediaService = {
    ...noAuth(true),
    id: serviceId,
    name: 'Internet Radio',
    icon: serviceId,
    url: '',
    serviceType: ServiceType.PublicMedia,
    root: radioBrowserInfoSearch,
    sources: internetRadioSources,
    Components: {CreateStationDialog, EditStationDialog, ManageStations},
    canStore,
    compareForRating,
    getFilters: getRadioBrowserInfoFilters,
    scrobble,
};

export default internetRadio;

function canStore<T extends MediaObject>(item: T): boolean {
    return item?.itemType === ItemType.Media && item.linearType === LinearType.Station;
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}
