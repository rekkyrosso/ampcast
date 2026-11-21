import {debounceTime, mergeMap, Subject, switchMap, tap} from 'rxjs';
import {Writable} from 'type-fest';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import {Logger, moveSubset} from 'utils';
import {observePlaylistAdditions} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import soundcloudApi from './soundcloudApi';
import soundcloudSettings from './soundcloudSettings';
import {createMediaObjects} from './soundcloudUtils';

export interface SoundCloudPagerConfig<T extends MediaObject> extends PagerConfig<T> {
    readonly total?: number;
}

export default class SoundCloudPager<T extends MediaObject> extends SequentialPager<T> {
    private cursor = '';

    constructor(
        url: string,
        options?: Partial<SoundCloudPagerConfig<T>>,
        afterCreate?: (item: Writable<T>, index: number) => void
    ) {
        super(
            async (pageSize): Promise<Page<T>> => {
                const href = `${url}${url.includes('?') ? '&' : '?'}linked_partitioning=true&limit=${pageSize}`;
                const {collection, next_href} = await soundcloudApi.get<
                    SoundCloud.PaginatedResponse<SoundCloud.MediaObject>
                >(this.cursor || href);
                this.cursor = next_href || '';
                const size = this.items.length;
                const items = createMediaObjects<T>(collection);
                if (afterCreate) {
                    items.forEach((item, index) => afterCreate(item as Writable<T>, size + index));
                }
                return {
                    items,
                    total: options?.total,
                    atEnd: !next_href,
                };
            },
            {pageSize: 50, ...options}
        );
    }
}

// TODO: This needs to be exported from here to avoid circular references.

const logger = new Logger('SoundCloudPlaylistItemsPager');

export class SoundCloudPlaylistItemsPager extends SoundCloudPager<MediaItem> {
    private readonly sync$ = new Subject<void>();
    private positions: Record<string, number> = {};
    private trackUrns: string[] = []; // Urns in track order

    constructor(private readonly playlist: SoundCloud.Playlist) {
        const isMyPlaylist = playlist.user_id === soundcloudSettings.userId;
        const params = isMyPlaylist ? '?access=playable,preview,blocked' : '';
        super(
            `/playlists/${playlist.urn}/tracks${params}`,
            {
                pageSize: 1000,
                total: playlist.track_count,
                autofill: true,
                autofillInterval: 1000,
                autofillMaxPages: 10,
            },
            (item, index) => (item.position = index + 1)
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(items: readonly MediaItem[], toIndex = -1): void {
        this._addItems(items, toIndex);
        this.sync$.next();
    }

    moveItems(selection: readonly MediaItem[], toIndex: number): void {
        const items = moveSubset(this.items, selection, toIndex);
        if (items !== this.items) {
            this.items = items;
            this.trackUrns = items.map((item) => item.src);
            this.sync$.next();
        }
    }

    removeItems(removals: readonly MediaItem[]): void {
        if (removals.length === 0) {
            return;
        }
        const trackUrns = new Set(this.trackUrns);
        const urnsToRemove: Record<string, true | undefined> = {};
        removals.forEach((item) => {
            urnsToRemove[item.src] = true;
            trackUrns.delete(item.src);
        });
        const items = this.items.filter((item) => !urnsToRemove[item.src]);
        this.size = items.length;
        this.items = items;
        this.trackUrns = [...trackUrns];
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
                    switchMap(() => observePlaylistAdditions(this.playlist.urn)),
                    tap((items) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[], toIndex = -1): void {
        const trackUrns = new Set(this.trackUrns);
        additions = additions.filter(
            (item) => item.src.startsWith('soundcloud:tracks:') && !trackUrns.has(item.src)
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
            this.trackUrns = items.map((item) => item.src);
        } else {
            // append
            const size = this.trackUrns.length;
            additions.forEach((item, index) => {
                const position = size + index + 1;
                this.trackUrns.push(item.src);
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
            this.error = undefined;
            this.synchPositions();
            await soundcloudApi.updatePlaylistTracks(this.playlist.urn, this.trackUrns);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }

    private synchPositions(): void {
        this.positions = {};
        this.trackUrns.forEach((id, index) => (this.positions[id] = index + 1));
        this.items.forEach((item) => {
            (item as any).position = this.positions[item.src];
        });
    }
}
