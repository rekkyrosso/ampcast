import SubsonicService from './factory/SubsonicService';

const ampache = new SubsonicService({
    id: 'ampache',
    name: 'Ampache',
    url: 'https://ampache.org',
    listingName: 'Ampache (Subsonic API)',
});

export default ampache;
