import SubsonicService from 'services/subsonic/factory/SubsonicService';

const airsonic = new SubsonicService(
    'airsonic',
    'Airsonic',
    'https://github.com/airsonic-advanced/airsonic-advanced',
    'Airsonic-Advanced'
);

export default airsonic;
