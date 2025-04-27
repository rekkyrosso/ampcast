import {Except} from 'type-fest';
import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFolder from './MediaFolder';
import MediaPlaylist from './MediaPlaylist';

export type Pinnable = MediaAlbum | MediaArtist | MediaPlaylist | MediaFolder;

type Pin<T extends Pinnable = Pinnable> = Except<T, 'isPinned' | 'pager'> & {
    readonly isPinned: true;
};

export default Pin;
