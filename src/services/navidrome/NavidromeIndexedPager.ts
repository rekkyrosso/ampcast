import {BehaviorSubject, debounceTime, filter, mergeMap, switchMap, tap} from 'rxjs';
import MiniSearch from 'minisearch';
import {nanoid} from 'nanoid';
import {Primitive} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import SortParams from 'types/SortParams';
import {Logger} from 'utils';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {dispatchMetadataChanges, observePlaylistItemsChange} from 'services/metadata';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject, getMediaObjectId} from './navidromeUtils';

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
        private readonly playlistId: string,
        private readonly itemSort?: SortParams,
        options?: Partial<PagerConfig<MediaItem>>
    ) {
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
            {autofill: true, pageSize: 1000, ...options}
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(items: readonly MediaItem[]): void {
        this._addItems(items);
        this.synchAdditions(items);
    }

    // Navidrome uses `id` to provide a unique playlist id in the event of duplicates.
    // Navidrome's `id` is basically an index. So this is not easy to manage.

    removeItems(removals: readonly MediaItem[]): void {
        if (removals.length === 0) {
            return;
        }
        const idsToRemove = new Set<string>();
        removals.forEach((item) => idsToRemove.add(item.playlistItemId!));
        const items = this.items.filter((item) => !idsToRemove.has(item.playlistItemId!));
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
                    switchMap(() => observePlaylistItemsChange()),
                    filter(
                        ({type, src}) =>
                            type === 'added' && src === `navidrome:playlist:${this.playlistId}`
                    ),
                    tap(({items}) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[]): void {
        additions = additions.filter((item) => item.src.startsWith('navidrome:audio:'));
        if (additions.length === 0) {
            return;
        }
        // Append only.
        const items = this.items.slice();
        additions.forEach((item) => {
            const position = items.length + 1;
            items.push({
                ...item,
                position,
                playlistItemId: String(position),
                nanoId: nanoid(),
            });
        });
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
    }

    private async synchAdditions(additions: readonly MediaItem[]) {
        this.busy = true;
        try {            
            this.error = undefined;
            await navidromeApi.addToPlaylist(this.playlistId, additions.map(getMediaObjectId));
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private async synchRemovals(removals: readonly string[]): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            await navidromeApi.removeFromPlaylist(this.playlistId, removals);
            this.items.forEach((item) => ((item as any).playlistItemId = String(item.position)));
            this.items = this.items.slice();
            this.removals$.next([]);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private updateTrackCount(): void {
        dispatchMetadataChanges({
            match: (object) => object.src === `navidrome:playlist:${this.playlistId}`,
            values: {trackCount: this.size},
        });
    }
}
