import SubsonicService from './factory/SubsonicService';

const ampache = new SubsonicService(
    'ampache',
    'Ampache',
    'https://ampache.org',
    'Ampache (Subsonic API)'
);

export default ampache;
