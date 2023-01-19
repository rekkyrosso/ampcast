import {Except} from 'type-fest';
import MediaPlaylist from 'types/MediaPlaylist';

export type Pin = Except<MediaPlaylist, 'pager'>;
