import {Except} from 'type-fest';
import MediaPlaylist from 'types/MediaPlaylist';

type Pin = Except<MediaPlaylist, 'pager'>;

export default Pin;
