import {Subject, debounceTime, filter, mergeMap, switchMap, tap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import {Logger, moveSubset} from 'utils';
import {observePlaylistItemsChange} from 'services/metadata';
import IBroadcastPager from './IBroadcastPager';
import ibroadcastLibrary from './ibroadcastLibrary';
import {createMediaItem, getIdFromSrc, sortTracks} from './ibroadcastUtils';

const logger = new Logger('IBroadcastPlaylistItemsPager');

export default class IBroadcastPlaylistItemsPager extends IBroadcastPager<MediaItem> {
    private readonly sync$ = new Subject<void>();
    private positions: Record<number, number> = {};
    private trackIds: number[] = []; // Ids in track order

    constructor(
        private readonly playlistId: number,
        itemSort?: SortParams,
        options?: Partial<PagerConfig<MediaItem>>
    ) {
        super(
            'tracks',
            async () => {
                const library = await ibroadcastLibrary.load();
                const playlists = library.playlists;
                const playlist = playlists[playlistId];
                const map = playlists.map;
                const trackIds: number[] | undefined = playlist?.[map.tracks]?.slice();
                if (!trackIds) {
                    throw Error('Tracks not found');
                }
                this.trackIds = trackIds;
                trackIds.forEach((id, index) => (this.positions[id] = index + 1));
                if (itemSort) {
                    const {sortBy, sortOrder} = itemSort;
                    if (sortBy === 'position') {
                        return sortOrder === -1 ? trackIds.toReversed() : trackIds;
                    }
                    const tracks = library.tracks;
                    const map = tracks.map;
                    return trackIds.toSorted((a, b) =>
                        sortTracks(sortBy, sortOrder, tracks[a], tracks[b], map, library)
                    );
                } else {
                    return trackIds;
                }
            },
            options
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(items: readonly MediaItem[], toIndex = -1): void {
        this._addItems(items, toIndex);
        this.sync$.next();
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        if (selection.length === 0) {
            return;
        }
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.items = items;
            this.trackIds = items.map(getIdFromSrc);
            this.sync$.next();
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        if (removals.length === 0) {
            return;
        }
        const trackIds = new Set(this.trackIds);
        const srcsToRemove: Record<string, true | undefined> = {};
        removals.forEach((item) => {
            srcsToRemove[item.src] = true;
            const id = getIdFromSrc(item);
            trackIds.delete(id);
        });
        const items = this.items.filter((item) => !srcsToRemove[item.src]);
        this.size = items.length;
        this.items = items;
        this.trackIds = [...trackIds];
        this.sync$.next();
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.sync$.pipe(
                    debounceTime(500),
                    mergeMap(() => this.synch())
                ),
                logger
            );
            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistItemsChange()),
                    filter(
                        ({type, src}) =>
                            type === 'added' && src === `ibroadcast:playlist:${this.playlistId}`
                    ),
                    tap(({items}) => this._addItems(items))
                ),
                logger
            );
        }
    }

    protected createItem(library: iBroadcast.Library, id: number): MediaItem {
        return createMediaItem(id, library, this.positions[id]);
    }

    private _addItems(additions: readonly MediaItem[], toIndex = -1): void {
        const trackIds = new Set(this.trackIds);
        additions = additions.filter(
            (item) => item.src.startsWith('ibroadcast:track:') && !trackIds.has(getIdFromSrc(item))
        );
        if (additions.length === 0) {
            return;
        }

        const items = this.items.slice();

        if (toIndex >= 0 && toIndex < items.length) {
            // insert
            items.splice(
                toIndex,
                0,
                ...additions.map((item, index) => {
                    return {...item, position: toIndex + index + 1};
                })
            );
            this.trackIds = items.map(getIdFromSrc);
        } else {
            // append
            const size = this.trackIds.length;
            additions.forEach((item, index) => {
                const id = getIdFromSrc(item);
                const position = size + index + 1;
                this.trackIds.push(id);
                items.push({
                    ...item,
                    position,
                });
            });
        }
        this.size = items.length;
        this.items = items;
    }

    private async synch(): Promise<void> {
        this.busy = true;
        try {
            this.synchPositions();
            await ibroadcastLibrary.updatePlaylistTracks(this.playlistId, this.trackIds);
        } catch (err) {
            logger.error(err);
        }
        this.busy = false;
    }

    private synchPositions(): void {
        this.positions = {};
        this.trackIds.forEach((id, index) => (this.positions[id] = index + 1));
        this.items.forEach((item) => {
            const id = getIdFromSrc(item);
            (item as any).position = this.positions[id];
        });
    }
}
