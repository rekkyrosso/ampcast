import {BehaviorSubject, debounceTime, filter, map, mergeMap, switchMap, tap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {Logger, moveSubset, uniqBy} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import plexApi, {PlexRequest} from './plexApi';
import plexSettings from './plexSettings';
import {createMediaObjects, getMediaAlbums, getMetadata} from './plexUtils';

export default class PlexPager<T extends MediaObject> extends IndexedPager<T> {
    constructor(
        request: PlexRequest,
        options?: Partial<PagerConfig<T>>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const page = await plexApi.getPage(
                    request,
                    (pageNumber - 1) * pageSize,
                    pageSize
                );
                const [plexItems, albums] = await Promise.all([
                    getMetadata(page.items),
                    getMediaAlbums(page.items),
                ]);
                const items = createMediaObjects<T>(
                    plexItems,
                    parent,
                    albums,
                    getSourceSorting(this.childSortId) || options?.childSort
                );
                return {items, total: page.total};
            },
            {
                pageSize: plexSettings.connection?.local ? 500 : 200,
                ...options,
            },
            createChildPager
        );
    }
}

// TODO: This needs to be exported from here to avoid circular references.

const logger = new Logger('PlexPlaylistItemsPager');

export class PlexPlaylistItemsPager extends PlexPager<MediaItem> {
    private readonly synch$ = new BehaviorSubject(false);

    constructor(
        private readonly playlist: MediaPlaylist,
        request: PlexRequest
    ) {
        super(request, {autofill: true, pageSize: 1000});
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(additions: readonly MediaItem[], atIndex = -1): void {
        additions = uniqBy('src', additions).filter((item) => !this.keys.has(item.src));
        if (additions.length > 0) {
            this._addItems(additions, atIndex);
            this.synch$.next(true);
        }
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.items = items;
            this.synch$.next(true);
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        const srcsToRemove = new Set(removals.map((item) => item.src));
        const items = this.items.filter((item) => !srcsToRemove.has(item.src));
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
        this.synch$.next(true);
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.synch$.pipe(
                    filter((synch) => synch),
                    debounceTime(500),
                    mergeMap(() => this.synch())
                ),
                logger
            );
            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistAdditions(this.playlist)),
                    map((items) => uniqBy('src', items).filter((item) => !this.keys.has(item.src))),
                    filter((items) => items.length > 0),
                    tap((items) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[], atIndex = -1): void {
        const items = this.items.slice();
        if (atIndex >= 0 && atIndex < items.length) {
            // insert
            items.splice(atIndex, 0, ...additions);
        } else {
            // append
            items.push(...additions);
        }
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
    }

    private async synch(): Promise<void> {
        this.busy = true;
        try {
            this.error = undefined;
            await plexApi.clearPlaylist(this.playlist);
            await plexApi.addToPlaylist(this.playlist, this.items);
            this.synch$.next(false);
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
