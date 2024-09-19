import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFolderItem from './MediaFolderItem';
import MediaItem from './MediaItem';
import MediaPlaylist from './MediaPlaylist';

type MediaObject = MediaAlbum | MediaArtist | MediaItem | MediaPlaylist | MediaFolderItem;

export default MediaObject;
