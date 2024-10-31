import {of} from 'rxjs';
import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';

const serviceId = 'plex-tidal';

const tidal: PublicMediaService = {
    disabled: true,
    defaultNoScrobble: true,

    id: serviceId,
    name: 'TIDAL',
    icon: serviceId,
    url: 'https://listen.tidal.com',
    serviceType: ServiceType.PublicMedia,
    defaultHidden: true,
    sources: [],
    root: {
        id: `${serviceId}/`,
        title: '',
        icon: serviceId,
        sources: [],
    },
    observeIsLoggedIn: () => of(false),
    isConnected: () => false,
    isLoggedIn: () => false,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    canRate: () => false,
    canStore: () => false,
    compareForRating: () => false,
};

export default tidal;
