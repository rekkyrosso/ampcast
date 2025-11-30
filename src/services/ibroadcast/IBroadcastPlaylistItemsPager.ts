import type {Observable} from 'rxjs';
import {BehaviorSubject, debounceTime, mergeMap, tap} from 'rxjs';
import {filter} from 'rxjs';
import MediaItem from 'types/MediaItem';
import SortParams from 'types/SortParams';
import {Logger} from 'utils';
import IBroadcastPager from './IBroadcastPager';
import ibroadcastLibrary, {IBroadcastLibraryChange} from './ibroadcastLibrary';
import {createMediaItem, getIdFromSrc, sortByTitle} from './ibroadcastUtils';

const logger = new Logger('IBroadcastPlaylistItemsPager');

export default class IBroadcastPlaylistItemsPager extends IBroadcastPager<MediaItem> {
    private readonly removals$ = new BehaviorSubject<readonly number[]>([]);

    constructor(private readonly id: number, private readonly itemSort?: SortParams) {
        super(
            'tracks',
            async () => {
                const library = await ibroadcastLibrary.load();
                const playlists = library.playlists;
                const playlist = playlists[id];
                const map = playlists.map;
                const trackIds: number[] | undefined = playlist?.[map.tracks];
                if (!trackIds) {
                    throw Error('Tracks not found');
                }
                return trackIds;
            },
            undefined,
            undefined,
            () => this.observeChanges(id)
        );
    }

    // If you override a setter then you must also override the getter.
    protected get items(): readonly MediaItem[] {
        return super.items;
    }

    protected set items(items: readonly MediaItem[]) {
        if (this.itemSort) {
            const {sortBy, sortOrder = 1} = this.itemSort;
            items = items.toSorted((a, b) => {
                switch (sortBy) {
                    case 'title':
                        return sortByTitle(a.title, b.title) * sortOrder;

                    case 'artist':
                        return sortByTitle(a.artists?.[0] || '', b.artists?.[0] || '') * sortOrder;

                    case 'position':
                        return (a.position! - b.position!) * sortOrder;

                    default:
                        return 0;
                }
            });
        }
        super.items = items;
    }

    removeItems(removals: readonly MediaItem[]): void {
        const prevItems = this.items;
        const srcsToRemove = removals.map((item) => item.src);
        const idsToRemove = removals.map(getIdFromSrc);
        const items = prevItems.filter((item) => !srcsToRemove.includes(item.src)) || [];
        this.size = items.length;
        this.items = items;
        this.removals$.next(this.removals$.value.concat(idsToRemove));
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.removals$.pipe(
                    debounceTime(500),
                    filter((removals) => removals.length > 0),
                    mergeMap((removals) =>
                        ibroadcastLibrary.removePlaylistTracks(this.id, removals)
                    ),
                    tap(() => this.removals$.next([]))
                ),
                logger
            );
        }
    }

    protected createItem(library: iBroadcast.Library, id: number, index: number): MediaItem {
        return createMediaItem(id, library, index + 1);
    }

    private observeChanges(id: number): Observable<IBroadcastLibraryChange<'playlists'>> {
        return ibroadcastLibrary
            .observeChanges('playlists')
            .pipe(
                filter(
                    (change) =>
                        change.type === 'data' &&
                        change.id === id &&
                        change.fields.includes('tracks')
                )
            );
    }
}
