import SubsonicService from './factory/SubsonicService';

const subsonic = new SubsonicService({
    id: 'subsonic',
    name: 'Subsonic',
    url: 'http://www.subsonic.org',
    listingName: 'Subsonic (or compatible)',
});

export default subsonic;
