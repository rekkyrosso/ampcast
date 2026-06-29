import SubsonicService from './factory/SubsonicService';

const airsonic = new SubsonicService({
    id: 'airsonic',
    name: 'Airsonic',
    url: 'https://github.com/airsonic-advanced/airsonic-advanced',
    listingName: 'Airsonic-Advanced',
});

export default airsonic;
