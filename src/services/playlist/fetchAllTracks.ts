import {combineLatest, filter, map, race, take, timer} from 'rxjs';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';

export default function fetchAllTracks(
    item: MediaAlbum | MediaPlaylist
): Promise<readonly MediaItem[]> {
    return new Promise((resolve, reject) => {
        const pager = item.pager;
        const limit = item.trackCount ?? 500;
        const items$ = combineLatest([pager.observeItems(), pager.observeSize()]).pipe(
            filter(
                ([items, size]) => items.reduce((total) => (total += 1), 0) >= Math.min(size, limit)
            ),
            map(([items]) => items),
            take(1)
        );
        const error$ = race(
            pager
                .observeError()
                .pipe(
                    map((error: any) =>
                        error instanceof Error ? error : Error(error?.message || 'unknown')
                    )
                ),
            timer(5000).pipe(map(() => Error('timeout')))
        );
        race(items$, error$).subscribe((result) => {
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve(result);
            }
        });
        item.pager.fetchAt(0, limit);
    });
}
