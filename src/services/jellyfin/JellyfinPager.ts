import {BehaviorSubject, debounceTime, filter, map, mergeMap, switchMap, tap} from 'rxjs';
import MiniSearch from 'minisearch';
import unidecode from 'unidecode';
import type {BaseItemDto} from '@jellyfin/sdk/lib/generated-client/models';
import {Primitive} from 'type-fest';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import SortParams from 'types/SortParams';
import {Logger, getMediaObjectId, moveSubset, uniqBy} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import jellyfinSettings from './jellyfinSettings';
import jellyfinApi from './jellyfinApi';
import {createMediaObject, getSortParams} from './jellyfinUtils';

export default class JellyfinPager<T extends MediaObject> extends IndexedPager<T> {
    constructor(
        path: string,
        private readonly params: Record<string, Primitive> = {},
        options?: Partial<PagerConfig<T>>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                let page = await jellyfinApi.getPage(path, {
                    ...params,
                    Limit: String(pageSize),
                    StartIndex: String((pageNumber - 1) * pageSize),
                });
                if (
                    this.params.SearchTerm &&
                    !this.passive &&
                    pageNumber === 1 &&
                    /Audio|MusicAlbum/.test(this.params.IncludeItemTypes as string) &&
                    page.items.length < pageSize
                ) {
                    // Fetch enhanced results if we have fewer items than the page size.
                    page = await this.fetchMoreSearchItems(page.items);
                }
                return {
                    ...page,
                    items: page.items.map((item) =>
                        createMediaObject(
                            item,
                            parent,
                            getSourceSorting(this.childSortId) || options?.childSort
                        )
                    ),
                };
            },
            {
                ...options,
                pageSize: Math.min(
                    options?.maxSize || Infinity,
                    options?.pageSize || (jellyfinSettings.isLocal ? 500 : 200)
                ),
            },
            createChildPager
        );
    }

    private async fetchMoreSearchItems(
        initialItems: readonly BaseItemDto[]
    ): Promise<Page<BaseItemDto>> {
        const path = `Users/${jellyfinSettings.userId}/Items`;
        const params = {ParentId: jellyfinSettings.libraryId};
        const itemType = this.params.IncludeItemTypes;
        const query = this.params.SearchTerm as string;
        let items: readonly BaseItemDto[] = initialItems;
        // Fetch underlying artists.
        const page = await jellyfinApi.getPage('Artists', {
            ...params,
            UserId: jellyfinSettings.userId,
            SearchTerm: query,
            Limit: 50,
        });
        const artistIds = page.items.map((artist) => artist.Id).join(',');
        if (itemType === 'Audio') {
            // Fetch artist tracks.
            const page = await jellyfinApi.getPage(path, {
                ...params,
                ArtistIds: artistIds,
                IncludeItemTypes: 'Audio',
                Limit: this.pageSize,
            });
            items = uniqBy('Id', initialItems.concat(page.items));
            items = this.refineTracksSearchResults(query, items);
        } else if (itemType === 'MusicAlbum') {
            // Fetch artist albums.
            const decode = (name: string) => unidecode(name).toLowerCase();
            const decodedQuery = decode(query);
            const page = await jellyfinApi.getPage(path, {
                ...params,
                ArtistIds: artistIds,
                IncludeItemTypes: 'MusicAlbum',
                Limit: this.pageSize,
            });
            items = uniqBy(
                'Id',
                initialItems.concat(
                    page.items.filter((album) =>
                        decode(album.AlbumArtist || '').includes(decodedQuery)
                    )
                )
            );
        }
        return {items, total: items.length, atEnd: true};
    }

    private refineTracksSearchResults(
        q: string,
        tracks: readonly BaseItemDto[]
    ): readonly BaseItemDto[] {
        const tracksMap = new Map(tracks.map((track) => [track.Id, track]));
        const fields = ['title', 'artist', 'album'];
        const miniSearch = new MiniSearch({fields});
        miniSearch.addAll(
            tracks.map((track) => ({
                id: track.Id,
                title: track.Name,
                artist: `${track.Artists || ''};${track.AlbumArtist || ''}`,
                album: track.Album || '',
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

const logger = new Logger('JellyfinPlaylistItemsPager');

export class JellyfinPlaylistItemsPager extends JellyfinPager<MediaItem> {
    private readonly synch$ = new BehaviorSubject(false);

    constructor(
        private readonly playlist: MediaPlaylist,
        itemSort: SortParams
    ) {
        super(
            `Users/${jellyfinSettings.userId}/Items`,
            {
                ParentId: getMediaObjectId(playlist),
                IncludeItemTypes: 'Audio,MusicVideo',
                ...getSortParams(itemSort),
            },
            {autofill: true, pageSize: 1000}
        );
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
            const playlistId = getMediaObjectId(this.playlist);
            const ids = this.items.map((item) => getMediaObjectId(item));
            await jellyfinApi.updatePlaylist(playlistId, ids);
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
