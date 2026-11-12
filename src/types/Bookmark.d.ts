import {Except} from 'type-fest';
import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaItem from './MediaItem';
import MediaPlaylist from './MediaPlaylist';

type Bookmark = (Except<MediaAlbum | MediaArtist | MediaPlaylist, 'pager'> | MediaItem) & {
    readonly bookmarkedAt: number;
};

export default Bookmark;
