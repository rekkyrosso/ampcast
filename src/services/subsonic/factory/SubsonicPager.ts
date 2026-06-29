import {BehaviorSubject, debounceTime, filter, mergeMap, switchMap, tap} from 'rxjs';
import {nanoid} from 'nanoid';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {Logger, getMediaObjectId, moveSubset} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import type SubsonicService from './SubsonicService';
import type SubsonicApi from './SubsonicApi';
import type SubsonicUtils from './SubsonicUtils';

export default class SubsonicPager<T extends MediaObject> extends SequentialPager<T> {
    constructor(
        protected readonly service: SubsonicService,
        itemType: T['itemType'],
        fetch: (offset: number, count: number) => Promise<Page<Subsonic.MediaObject>>,
        options?: Partial<PagerConfig<T>>,
        protected readonly parent?: ParentOf<T>
    ) {
        let pageNumber = 1;

        super(
            async (count: number): Promise<Page<T>> => {
                const offset = (pageNumber - 1) * count;
                const {items, total, atEnd} = await fetch(offset, count);
                pageNumber++;
                return {
                    items: items.map((item, index) =>
                        this.utils.createMediaObject(
                            itemType,
                            item,
                            parent,
                            parent?.itemType === ItemType.Playlist ? index + 1 : undefined
                        )
                    ),
                    total,
                    atEnd,
                };
            },
            {pageSize: 200, ...options}
        );
    }

    protected get api(): SubsonicApi {
        return this.service.api;
    }

    protected get utils(): SubsonicUtils {
        return this.service.utils;
    }
}

// TODO: This needs to be exported from here to avoid circular references.

const logger = new Logger('SubsonicPlaylistItemsPager');

export class SubsonicPlaylistItemsPager extends SubsonicPager<MediaItem> {
    private readonly removals$ = new BehaviorSubject<readonly number[]>([]);

    constructor(
        service: SubsonicService,
        playlist: MediaPlaylist,
        items?: readonly Subsonic.MediaItem[]
    ) {
        const [, , playlistId] = playlist.src.split(':');
        super(
            service,
            ItemType.Media,
            async () => {
                if (!items) {
                    items = await this.api.getPlaylistItems(playlistId);
                }
                return {items, atEnd: true};
            },
            {itemKey: 'nanoId' as any},
            playlist
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

    // The Subsonic API uses indexes for removals.
    // The playlist item index is stored in `playlistItemId` of `MediaItem`.

    removeItems(removals: readonly MediaItem[]): void {
        const indexesToRemove = new Set(removals.map((item) => Number(item.playlistItemId)));
        const items = this.items.filter(
            (item) => !indexesToRemove.has(Number(item.playlistItemId))
        );
        this.size = items.length;
        this.items = items;
        this.removals$.next(this.removals$.value.concat([...indexesToRemove]));
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
            const indexesToRemove: number[] = [];
            this.items.forEach((item) => {
                if (item.playlistItemId != null) {
                    indexesToRemove.push(Number(item.playlistItemId));
                }
            });
            const idsToAdd = this.items.map((item) => getMediaObjectId(item));
            await this.api.removeFromPlaylist(playlistId, indexesToRemove);
            await this.api.addToPlaylist(playlistId, idsToAdd);
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
            await this.api.addToPlaylist(playlistId, additions.map(getMediaObjectId));
            this.synchPlaylistItemIds();
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private synchPlaylistItemIds(): void {
        this.items.forEach((item) => ((item as any).playlistItemId = String(item.position! - 1)));
        this.items = this.items.slice();
    }

    private synchPositions(items: readonly MediaItem[]): void {
        items.forEach((item, index) => ((item as any).position = index + 1));
    }

    private async synchRemovals(removals: readonly number[]): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            this.synchPositions(this.items);
            this.items = this.items.slice();
            const playlistId = getMediaObjectId(this.playlist);
            await this.api.removeFromPlaylist(playlistId, removals);
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
