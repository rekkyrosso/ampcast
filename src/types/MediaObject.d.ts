import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaItem from './MediaItem';
import MediaFolder from './MediaFolder';
import MediaPlaylist from './MediaPlaylist';

type MediaObject = MediaAlbum | MediaArtist | MediaItem | MediaPlaylist | MediaFolder;

export default MediaObject;
