import MediaPlaylist from 'types/MediaPlaylist';
import usePager from 'hooks/usePager';

export default function useIsPlaylistPlayable(playlist?: MediaPlaylist): boolean {
    const pager = playlist?.pager || null;
    const [{items}] = usePager(pager);
    if (pager) {
        const pageSize = pager.pageSize;
        const playlistSize = playlist!.trackCount ?? pager.maxSize;
        const itemCount = items.reduce((total) => (total += 1), 0);
        return playlistSize == null ? false : itemCount + 2 * pageSize >= playlistSize;
    } else {
        return false;
    }
}
