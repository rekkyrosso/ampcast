import {BehaviorSubject, debounceTime, filter, mergeMap, switchMap, tap} from 'rxjs';
import MiniSearch from 'minisearch';
import {nanoid} from 'nanoid';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import {Logger, getMediaObjectId, moveSubset} from 'utils';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject} from './navidromeUtils';

export default class NavidromeIndexedPager<T extends MediaObject> extends IndexedPager<T> {
    constructor(
        itemType: T['itemType'],
        path: string,
        params?: Record<string, Primitive>,
        options?: Partial<PagerConfig<T>>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const _start = (pageNumber - 1) * pageSize;
                const _end = _start + pageSize;
                let {items, total} = await navidromeApi.getPage(path, {
                    ...params,
                    _start,
                    _end,
                    library_id: navidromeSettings.libraryId,
                });
                if (
                    path === 'song' &&
                    params?.title &&
                    !this.passive &&
                    pageNumber === 1 &&
                    items.length < pageSize
                ) {
                    // Fetch enhanced results if we have fewer items than the page size.
                    items = this.refineTracksSearchResults(
                        params.title as string,
                        items as Navidrome.Song[]
                    );
                    total = items.length;
                }
                return {
                    items: items.map((item) =>
                        createMediaObject(
                            itemType,
                            item,
                            path === 'radio',
                            getSourceSorting(this.childSortId) || options?.childSort
                        )
                    ),
                    total,
                };
            },
            {pageSize: 200, ...options},
            createChildPager
        );
    }

    private refineTracksSearchResults(
        q: string,
        tracks: readonly Navidrome.Song[]
    ): readonly Navidrome.Song[] {
        const tracksMap = new Map(tracks.map((track) => [track.id, track]));
        const fields = ['title', 'artist', 'album'];
        const miniSearch = new MiniSearch({fields});
        miniSearch.addAll(
            tracks.map((track) => ({
                id: track.id,
                title: track.title,
                artist: `${track.artist || ''};${track.albumArtist || ''}`,
                album: track.album || '',
            }))
        );
        return miniSearch
            .search(q, {
                fields,
                fuzzy: 0.2,
                prefix: true,
                boost: {artist: 0.5, album: 0.25},
            })
            .map((entry) => tracksMap.get(entry.id)!);
    }
}

// TODO: This needs to be exported from here to avoid circular references.

const logger = new Logger('NavidromePlaylistItemsPager');

export class NavidromePlaylistItemsPager extends NavidromeIndexedPager<MediaItem> {
    private readonly removals$ = new BehaviorSubject<readonly string[]>([]);

    constructor(
        private readonly playlist: MediaPlaylist,
        private readonly itemSort?: SortParams,
        options?: Partial<PagerConfig<MediaItem>>
    ) {
        const playlistId = getMediaObjectId(playlist);
        super(
            ItemType.Media,
            `playlist/${playlistId}/tracks`,
            {
                playlist_id: playlistId,
                ...(itemSort
                    ? {
                          _sort: itemSort.sortBy,
                          _order: itemSort.sortOrder === -1 ? 'DESC' : 'ASC',
                      }
                    : {}),
            },
            {autofill: true, pageSize: 1000, itemKey: 'nanoId' as any, ...options}
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(additions: readonly MediaItem[], position = -1): void {
        const append = position < 0 || position >= this.size!;
        this._addItems(additions, position);
        if (append) {
            this.synchAdditions(additions);
        } else {
            this.synch();
        }
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.synchPositions(items);
            this.items = items;
            this.synch();
        }
    }

    // Navidrome uses `id` to provide a unique playlist id in the event of duplicates.
    // Navidrome's `id` is basically an index. So this is not easy to manage.
    // The playlist item `id` is stored in `playlistItemId` of `MediaItem`.

    removeItems(removals: readonly MediaItem[]): void {
        const idsToRemove = new Set(removals.map((item) => item.playlistItemId!));
        const items = this.items.filter((item) => !idsToRemove.has(item.playlistItemId!));
        this.size = items.length;
        this.items = items;
        this.removals$.next(this.removals$.value.concat([...idsToRemove]));
        this.updateTrackCount();
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.removals$.pipe(
                    filter((removals) => removals.length > 0),
                    debounceTime(500),
                    mergeMap((removals) => this.synchRemovals(removals))
                ),
                logger
            );
            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistAdditions(this.playlist)),
                    tap((items) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[], position = -1): void {
        const items = this.items.slice();
        if (position >= 0 && position < items.length) {
            // insert
            items.splice(position, 0, ...additions.map((item) => ({...item, nanoid: nanoid()})));
            this.synchPositions(items);
        } else {
            // append
            additions.forEach((item) => {
                const position = items.length + 1;
                items.push({
                    ...item,
                    position,
                    playlistItemId: String(position),
                    nanoId: nanoid(),
                });
            });
        }
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
    }

    private async synch(): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            const playlistId = getMediaObjectId(this.playlist);
            const idsToRemove: string[] = [];
            this.items.forEach((item) => {
                if (item.playlistItemId != null) {
                    idsToRemove.push(item.playlistItemId);
                }
            });
            const idsToAdd = this.items.map((item) => getMediaObjectId(item));
            await navidromeApi.removeFromPlaylist(playlistId, idsToRemove);
            await navidromeApi.addToPlaylist(playlistId, idsToAdd);
            this.synchPlaylistItemIds();
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private async synchAdditions(additions: readonly MediaItem[]) {
        this.busy = true;
        try {
            this.error = undefined;
            const playlistId = getMediaObjectId(this.playlist);
            await navidromeApi.addToPlaylist(playlistId, additions.map(getMediaObjectId));
            this.synchPlaylistItemIds();
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private synchPlaylistItemIds(): void {
        this.items.forEach((item) => ((item as any).playlistItemId = String(item.position)));
        this.items = this.items.slice();
    }

    private synchPositions(items: readonly MediaItem[]): void {
        const {sortBy = 'id', sortOrder = 1} = this.itemSort || {};
        if (sortBy === 'id' && sortOrder === 1) {
            items.forEach((item, index) => ((item as any).position = index + 1));
        } else {
            const newPositions: Record<number, number> = {};
            items
                .toSorted((a, b) => a.position! - b.position!)
                .forEach((item, index) => (newPositions[item.position!] = index + 1));
            items.forEach((item) => ((item as any).position = newPositions[item.position!]));
        }
    }

    private async synchRemovals(removals: readonly string[]): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            this.synchPositions(this.items);
            this.items = this.items.slice();
            const playlistId = getMediaObjectId(this.playlist);
            await navidromeApi.removeFromPlaylist(playlistId, removals);
            this.synchPlaylistItemIds();
            this.removals$.next([]);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private updateTrackCount(): void {
        dispatchMetadataChanges({
            match: (object) => object.src === this.playlist.src,
            values: {trackCount: this.size},
        });
    }
}
