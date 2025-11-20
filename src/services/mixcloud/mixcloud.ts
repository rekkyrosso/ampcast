import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';

const mixcloud: PublicMediaService = {
    ...noAuth(false),
    id: 'mixcloud',
    name: 'Mixcloud',
    icon: 'mixcloud',
    url: 'https://www.mixcloud.com',
    serviceType: ServiceType.PublicMedia,
    defaultNoScrobble: true,
    iframeAudioPlayback: {
        // Mixcloud player shows mainly interactive content.
        // Use CoverArt visualizer instead.
        showCoverArt: true,
    },
    compareForRating: () => false,
};

export default mixcloud;
