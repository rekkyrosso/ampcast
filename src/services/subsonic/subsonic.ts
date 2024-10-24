import SubsonicService from './factory/SubsonicService';

const subsonic = new SubsonicService(
    'subsonic',
    'Subsonic',
    'http://www.subsonic.org',
    'Subsonic (or compatible)'
);

export default subsonic;
