import {BehaviorSubject, debounceTime, filter, map, mergeMap, switchMap, tap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page, PagerConfig} from 'types/Pager';
import {exists, Logger, moveSubset} from 'utils';
import {
    dispatchMetadataChanges,
    observeMetadataChange,
    observePlaylistAdditions,
} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import spotifyApi, {spotifyApiCallWithRetry, SpotifyItem} from './spotifyApi';
import {addUserData, createMediaObject, getMarket} from './spotifyUtils';
import spotify from './spotify';

const logger = new Logger('SpotifyPager');

export interface SpotifyPage extends Page<SpotifyItem> {
    readonly next?: string | undefined;
}

export default class SpotifyPager<T extends MediaObject> extends SequentialPager<T> {
    private pageNumber = 1;
    private cursor = '';

    constructor(
        fetch: (offset: number, limit: number, cursor: string) => Promise<SpotifyPage>,
        options?: Partial<PagerConfig<T>>,
        inLibrary?: boolean | undefined
    ) {
        super(
            async (limit: number): Promise<Page<T>> => {
                const offset = (this.pageNumber - 1) * limit;
                const {items, total, next} = await spotifyApiCallWithRetry(() =>
                    fetch(offset, limit, this.cursor)
                );
                this.pageNumber++;
                this.cursor = next || '';
                return {
                    items: items.filter(exists).map((item) => createMediaObject(item, inLibrary)),
                    total,
                    atEnd: !next,
                };
            },
            {pageSize: 50, ...options}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (!this.passive) {
                this.subscribeTo(
                    this.observeAdditions().pipe(mergeMap((items) => addUserData(items))),
                    logger
                );
            }
        }
    }
}

// TODO: This needs to be exported from here to avoid circular references.

export class SpotifyPlaylistItemsPager extends SpotifyPager<MediaItem> {
    static MAX_SIZE_FOR_REORDER = 200;
    private readonly removals$ = new BehaviorSubject<readonly MediaItem[]>([]);

    constructor(private readonly playlist: MediaPlaylist) {
        const [, , playlistId] = playlist.src.split(':');
        super(
            async (offset: number, limit: number) => {
                const {items, total, next} = await spotifyApi.getPlaylistTracks(playlistId, {
                    offset,
                    limit,
                    market: getMarket(),
                });
                return {items: items.map((item) => item.track).filter(exists), total, next};
            },
            {
                autofill: true,
                autofillInterval: 1000,
                autofillMaxPages: 10,
            }
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(items: readonly MediaItem[], position?: number): void {
        items = items.filter((item) => !this.keys.has(item.src));
        if (items.length === 0) {
            return;
        }
        this._addItems(items, position);
        this.synchAdditions(items, position);
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.items = items;
            this.synchMoves();
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        if (removals.length === 0) {
            return;
        }
        const srcsToRemove = new Set<string>();
        removals.forEach((item) => srcsToRemove.add(item.src));
        const items = this.items.filter((item) => !srcsToRemove.has(item.src));
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
                    tap(({items}) => this._addItems(items))
                ),
                logger
            );
            this.subscribeTo(
                this.removals$.pipe(
                    filter((removals) => removals.length > 0),
                    debounceTime(500),
                    mergeMap((removals) => this.synchRemovals(removals))
                ),
                logger
            );
            // Keep Spotify's `snapshotId` in synch.
            this.subscribeTo(
                observeMetadataChange<MediaPlaylist>(this.playlist).pipe(
                    map((values) => values.snapshotId),
                    filter((snapshotId) => !!snapshotId),
                    tap((snapshotId) => Object.assign(this.playlist, {snapshotId}))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[], position = -1): void {
        additions = additions.filter((item) => !this.keys.has(item.src));
        if (additions.length === 0) {
            return;
        }
        let items = this.items.slice();
        if (position >= 0 && position < items.length) {
            // insert
            items.splice(position, 0, ...additions);
        } else {
            // append
            items = items.concat(additions);
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
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private async synchMoves(): Promise<void> {
        this.busy = true;
        try {
            // The Spotify API is pretty limited. And moved items need to be contiguous.
            // We are also limited to only moving 100 items.
            // The only realistic way to implement item re-ordering is to clear the existing
            // playlist and then re-write it.
            this.error = undefined;
            const [, , playlistId] = this.playlist.src.split(':');
            await spotifyApiCallWithRetry(() => spotifyApi.replaceTracksInPlaylist(playlistId, []));
            await spotify.addToPlaylist!(this.playlist, this.items);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private async synchRemovals(removals: readonly MediaItem[]): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            await spotify.removePlaylistItems!(this.playlist, removals);
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
