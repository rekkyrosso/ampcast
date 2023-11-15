import DataService from './DataService';
import PersonalMediaService from './PersonalMediaService';
import PublicMediaService from './PublicMediaService';

type MediaService =
    | PublicMediaService
    | PersonalMediaService
    | DataService;

export default MediaService;
