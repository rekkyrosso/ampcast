import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFolder from './MediaFolder';
import MediaFolderItem from './MediaFolderItem';
import MediaItem from './MediaItem';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';

type ChildOf<T extends MediaObject> = T extends MediaArtist
    ? MediaAlbum
    : T extends MediaFolder
    ? MediaFolderItem
    : T extends MediaAlbum | MediaPlaylist
    ? MediaItem
    : never;

export default ChildOf;
