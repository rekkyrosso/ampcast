import {BehaviorSubject, debounceTime, filter, mergeMap, switchMap, tap} from 'rxjs';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {exists, getMediaObjectId, Logger, moveSubset} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import spotifyApi, {SpotifyItem} from './spotifyApi';
import {createMediaObject} from './spotifyUtils';
import spotify from './spotify';

export interface SpotifyPage extends Page<SpotifyItem> {
    readonly next?: string | null;
}

export default class SpotifyPager<T extends MediaObject> extends SequentialPager<T> {
    private pageNumber = 1;
    private cursor = '';

    constructor(
        fetch: (offset: number, limit: number, cursor: string) => Promise<SpotifyPage>,
        options?: Partial<PagerConfig<T>>,
        inLibrary?: boolean | undefined,
        protected readonly parent?: ParentOf<T>
    ) {
        super(
            async (limit: number): Promise<Page<T>> => {
                const offset = (this.pageNumber - 1) * limit;
                const {items, total, next} = await fetch(offset, limit, this.cursor);
                this.pageNumber++;
                this.cursor = next || '';
                return {
                    items: items
                        .filter(exists)
                        .map((item, index) =>
                            createMediaObject(
                                item,
                                inLibrary,
                                parent?.itemType === ItemType.Playlist ? index + 1 : undefined
                            )
                        ),
                    total,
                    atEnd: !next,
                };
            },
            {pageSize: 40, ...options}
        );
    }
}

// TODO: This needs to be exported from here to avoid circular references.

const playlistLogger = new Logger('SpotifyPlaylistItemsPager');

export class SpotifyPlaylistItemsPager extends SpotifyPager<MediaItem> {
    static MAX_SIZE_FOR_REORDER = 500;
    private readonly removals$ = new BehaviorSubject<readonly MediaItem[]>([]);

    constructor(playlist: MediaPlaylist) {
        const playlistId = getMediaObjectId(playlist);
        super(
            async (offset: number, limit: number) => {
                const {items, total, next} = await spotifyApi.getPlaylistItems(
                    playlistId,
                    offset,
                    limit
                );
                return {items: items.map((track) => track.item).filter(exists), total, next};
            },
            {
                pageSize: 80,
                autofill: true,
                autofillInterval: 1000,
                autofillMaxPages: 10,
                itemKey: 'nanoId' as any,
            },
            undefined,
            playlist
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(additions: readonly MediaItem[], position?: number): void {
        this._addItems(additions, position);
        this.synchAdditions(additions, position);
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.synchPositions(items);
            this.items = items;
            this.synchMoves();
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        const idsToRemove = new Set(removals.map((item) => item.nanoId!));
        const items = this.items.filter((item) => !idsToRemove.has(item.nanoId!));
        this.size = items.length;
        this.items = items;
        this.removals$.next(this.removals$.value.concat(removals));
        this.updateTrackCount();
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistAdditions(this.playlist)),
                    tap((items) => this._addItems(items))
                ),
                playlistLogger
            );
            this.subscribeTo(
                this.removals$.pipe(
                    filter((removals) => removals.length > 0),
                    debounceTime(500),
                    mergeMap((removals) => this.synchRemovals(removals))
                ),
                playlistLogger
            );
        }
    }

    private get playlist(): MediaPlaylist {
        return this.parent as MediaPlaylist;
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
                    nanoId: nanoid(),
                });
            });
        }
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
    }

    private async synchAdditions(additions: readonly MediaItem[], position?: number) {
        this.busy = true;
        try {
            this.error = undefined;
            await spotify.addToPlaylist!(this.playlist, additions, position);
        } catch (err) {
            playlistLogger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private async synchMoves(): Promise<void> {
        this.busy = true;
        try {
            // The Spotify API is pretty limited, and moved items need to be contiguous.
            // We are also limited to only moving 100 items.
            // The only realistic way to implement item re-ordering is to clear the existing
            // playlist and then re-write it.
            this.error = undefined;
            const playlistId = getMediaObjectId(this.playlist);
            await spotifyApi.clearPlaylist(playlistId);
            await spotify.addToPlaylist!(this.playlist, this.items);
        } catch (err) {
            playlistLogger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private synchPositions(items: readonly MediaItem[]): void {
        items.forEach((item, index) => ((item as any).position = index + 1));
    }

    private async synchRemovals(removals: readonly MediaItem[]): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            this.synchPositions(this.items);
            this.items = this.items.slice();
            await spotify.removePlaylistItems!(this.playlist, removals);
            // Spotify removes *all" items with the same `uri` (the same as ampcast's `src`).
            // So we will have to put back any duplicates.
            const srcsToRemove = new Set(removals.map((item) => item.src));
            const restore = this.items
                .filter((item) => srcsToRemove.has(item.src))
                .sort((a, b) => a.position! - b.position!);
            for (const item of restore) {
                await spotify.addToPlaylist!(this.playlist, [item], item.position! - 1);
            }
            this.removals$.next([]);
        } catch (err) {
            playlistLogger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private updateTrackCount(): void {
        dispatchMetadataChanges({
            match: (object) => object.src === this.playlist.src,
            values: {
                trackCount: this.size,
                items: {
                    ...this.playlist.items,
                    moveable: this.size! <= SpotifyPlaylistItemsPager.MAX_SIZE_FOR_REORDER,
                },
            },
        });
    }
}
