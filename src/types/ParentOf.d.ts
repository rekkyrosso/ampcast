import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFolder from './MediaFolder';
import MediaItem from './MediaItem';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';

type ParentOf<T extends MediaObject> = T extends MediaItem
    ? MediaAlbum | MediaPlaylist | MediaFolder
    : T extends MediaAlbum
    ? MediaArtist
    : T extends MediaFolder
    ? MediaFolder | undefined
    : never;

export default ParentOf;
