import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import Pager from 'types/Pager';
import useSource from 'hooks/useSource';

export default function useEditablePlaylistsPager(
    service: MediaService | null
): Pager<MediaPlaylist> | null {
    return useSource(service?.editablePlaylists || null);
}
