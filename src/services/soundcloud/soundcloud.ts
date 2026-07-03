import PublicMediaService from 'types/PublicMediaService';
import ServiceType from 'types/ServiceType';
import noAuth from 'services/mediaServices/noAuth';

const soundcloud: PublicMediaService = {
    ...noAuth(false),
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: 'soundcloud',
    url: 'https://soundcloud.com',
    serviceType: ServiceType.PublicMedia,
    iframeAudioPlayback: {
        // The SoundCloud player shows mainly interactive content.
        // Use CoverArt visualizer instead.
        showCoverArt: true,
    },
    compareForRating: () => false,
};

export default soundcloud;
