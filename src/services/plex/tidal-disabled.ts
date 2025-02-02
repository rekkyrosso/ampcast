import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';

const tidal: PublicMediaService = {
    id: 'plex-tidal',
    name: 'TIDAL',
    icon: 'tidal',
    url: 'https://listen.tidal.com',
    serviceType: ServiceType.PublicMedia,
    defaultHidden: true,
    disabled: true,
    compareForRating: () => false,
    ...noAuth,
};

export default tidal;
