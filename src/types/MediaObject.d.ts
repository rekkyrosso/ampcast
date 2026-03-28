import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFolder from './MediaFolder';
import MediaItem from './MediaItem';
import MediaPlaylist from './MediaPlaylist';

type MediaObject = MediaAlbum | MediaArtist | MediaItem | MediaPlaylist | MediaFolder;

export default MediaObject;
