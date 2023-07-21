import PersonalMediaService from './PersonalMediaService';
import PublicMediaService from './PublicMediaService';
import Scrobbler from './Scrobbler';

type MediaService =
    | PublicMediaService
    | PersonalMediaService
    | Scrobbler;

export default MediaService;
