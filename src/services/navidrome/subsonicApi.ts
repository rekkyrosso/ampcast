import SubsonicApi from 'services/subsonic/factory/SubsonicApi';
import navidromeSettings from './navidromeSettings';

const subsonicApi = new SubsonicApi('navidrome', navidromeSettings);

export default subsonicApi;
