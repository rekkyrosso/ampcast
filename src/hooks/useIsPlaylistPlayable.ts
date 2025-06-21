import MediaPlaylist from 'types/MediaPlaylist';
import usePager from './usePager';

export default function useIsPlaylistPlayable(playlist?: MediaPlaylist): boolean {
    const pager = playlist?.pager || null;
    const [{items}] = usePager(pager);
    if (pager) {
        const playlistSize = playlist!.trackCount ?? pager.maxSize;
        if (playlistSize) {
            const pageSize = pager.pageSize;
            const itemCount = items.reduce((total) => (total += 1), 0);
            return itemCount + 2 * pageSize >= playlistSize;
        }
    }
    return false;
}
