import {mergeMap, switchMap, tap} from 'rxjs';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {Logger} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import SequentialPager from 'services/pagers/SequentialPager';
import apple, {addUserData} from './apple';
import {createMediaObjects, musicKitFetch, MusicKitItem} from './musicKitUtils';

const logger = new Logger('MusicKitPager');

export interface MusicKitPage extends Page<MusicKitItem> {
    readonly nextPageUrl?: string | undefined;
}

export default class MusicKitPager<T extends MediaObject> extends SequentialPager<T> {
    private nextPageUrl: string | undefined = undefined;

    static toPage(response: any): MusicKitPage {
        const result = response.data[0]?.relationships?.tracks || response;
        const items = result.data || [];
        const nextPageUrl = result.next;
        const total = result.meta?.total;
        return {items, total, nextPageUrl};
    }

    constructor(
        href: string,
        params?: MusicKit.QueryParameters,
        options?: Partial<PagerConfig<T>>,
        private readonly parent?: ParentOf<T>,
        toPage = MusicKitPager.toPage
    ) {
        super(
            async (limit) => {
                try {
                    const response = await musicKitFetch(
                        this.nextPageUrl || href,
                        limit ? (params ? {...params, limit} : {limit}) : params
                    );
                    const result = toPage(response.data);
                    const items = createMediaObjects(result.items, parent);
                    const total = result.total;
                    const atEnd = !result.nextPageUrl;
                    this.nextPageUrl = result.nextPageUrl;
                    return {items, total, atEnd};
                } catch (err: any) {
                    // Apple playlists return 404 if they are empty.
                    // If it's been deleted then it has no name/title.
                    if (
                        err.name === 'NOT_FOUND' &&
                        parent?.itemType === ItemType.Playlist &&
                        parent.title
                    ) {
                        return {items: [], total: 0, atEnd: true};
                    } else {
                        throw err;
                    }
                }
            },
            {pageSize: 100, ...options}
        );
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();

            if (!this.passive) {
                this.subscribeTo(
                    this.observeAdditions().pipe(
                        mergeMap((items) => addUserData(items, this.parent))
                    ),
                    logger
                );
            }
        }
    }
}

// TODO: This needs to be exported from here to avoid circular references.

export class MusicKitPlaylistItemsPager extends MusicKitPager<MediaItem> {
    constructor(
        private readonly playlist: MediaPlaylist,
        tracksUrl: string
    ) {
        super(
            tracksUrl,
            {'include[library-songs]': 'catalog'},
            {
                pageSize: 100,
                maxSize: playlist.isChart ? 100 : undefined,
                autofill: !playlist.isChart,
                autofillInterval: 1000,
                autofillMaxPages: 10,
            },
            playlist
        );
    }

    // (add|move|remove)Items will only be called if the playlist is complete.
    // Need to trust the UI on this.

    addItems(items: readonly MediaItem[]): void {
        items = items.filter((item) => !this.keys.has(item.src));
        if (items.length === 0) {
            return;
        }
        this._addItems(items);
        this.synchAdditions(items);
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
        }
    }

    private _addItems(additions: readonly MediaItem[]): void {
        additions = additions.filter((item) => !this.keys.has(item.src));
        if (additions.length === 0) {
            return;
        }
        // Append only.
        const items = this.items.concat(additions);
        this.size = items.length;
        this.items = items;
        dispatchMetadataChanges({
            match: (object) => object.src === this.playlist.src,
            values: {trackCount: this.size},
        });
    }

    private async synchAdditions(additions: readonly MediaItem[]) {
        this.busy = true;
        try {
            this.error = undefined;
            await apple.addToPlaylist!(this.playlist, additions);
        } catch (err) {
            logger.error(err);
            this.error = err;
        }
        this.busy = false;
    }
}
