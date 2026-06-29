import SubsonicService from 'services/subsonic/factory/SubsonicService';
import navidromeSettings from './navidromeSettings';

export const subsonicService = new SubsonicService(
    {
        id: 'navidrome',
        name: 'Navidrome',
        url: '',
    },
    navidromeSettings
);

export default subsonicService.api;
