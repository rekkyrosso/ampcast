import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaFolder from 'types/MediaFolder';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';

export type ParentOf<T extends MediaObject> = T extends MediaItem
    ? MediaAlbum | MediaPlaylist | MediaFolder
    : T extends MediaAlbum
    ? MediaArtist
    : T extends MediaFolder
    ? MediaFolder | undefined
    : never;
