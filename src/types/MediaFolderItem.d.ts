import {SetRequired} from 'type-fest';
import MediaFolder from './MediaFolder';
import MediaItem from './MediaItem';

type MediaFolderItem = MediaFolder | SetRequired<MediaItem, 'fileName'>;

export default MediaFolderItem;
