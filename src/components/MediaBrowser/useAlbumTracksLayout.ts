import MediaAlbum from 'types/MediaAlbum';
import {albumTracksLayout, otherTracksLayout, videosLayout} from 'components/MediaList/layouts';

export default function useAlbumTracksLayout(album: MediaAlbum | null) {
    if (album?.synthetic) {
        const [, type] = album.src.split(':');
        if (type === 'videos') {
            return videosLayout;
        } else {
            return otherTracksLayout;
        }
    } else {
        return albumTracksLayout;
    }
}
