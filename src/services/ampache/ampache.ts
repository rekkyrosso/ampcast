import SubsonicService from 'services/subsonic/factory/SubsonicService';

const ampache = new SubsonicService(
    'ampache',
    'Ampache',
    'https://ampache.org',
    'Ampache (Subsonic API)'
);

export default ampache;
