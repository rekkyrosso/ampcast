import {filter, map, switchMap, tap} from 'rxjs';
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
import {Logger, getMediaObjectId, uniqBy} from 'utils';
import {dispatchMetadataChanges, observePlaylistAdditions} from 'services/metadata';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import embySettings from './embySettings';
import embyApi from './embyApi';
import {createMediaObject, getSortParams} from './embyUtils';

export default class EmbyPager<T extends MediaObject> extends IndexedPager<T> {
    constructor(
        path: string,
        private readonly params: Record<string, Primitive> = {},
        options?: Partial<PagerConfig<T>>,
        parent?: ParentOf<T>,
        createChildPager?: CreateChildPager<T>
    ) {
        super(
            async (pageNumber, pageSize) => {
                const params = {
                    ...this.params,
                    Limit: pageSize,
                    StartIndex: (pageNumber - 1) * pageSize,
                };
                let page = await embyApi.getPage(path, params);
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
                    options?.pageSize || (embySettings.isLocal ? 500 : 200)
                ),
            },
            createChildPager
        );
    }

    private async fetchMoreSearchItems(
        initialItems: readonly BaseItemDto[]
    ): Promise<Page<BaseItemDto>> {
        const path = `Users/${embySettings.userId}/Items`;
        const params = {ParentId: embySettings.libraryId};
        const itemType = this.params.IncludeItemTypes;
        const query = this.params.SearchTerm as string;
        let items: readonly BaseItemDto[] = initialItems;
        // Fetch underlying artists.
        const page = await embyApi.getPage(path, {
            ...params,
            SearchTerm: query,
            IncludeItemTypes: 'MusicArtist',
            Limit: 50,
        });
        const artistIds = page.items.map((artist) => artist.Id).join(',');
        if (itemType === 'Audio') {
            // Fetch artist tracks.
            const page = await embyApi.getPage(path, {
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
            const page = await embyApi.getPage(path, {
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

const logger = new Logger('EmbyPlaylistItemsPager');

export class EmbyPlaylistItemsPager extends EmbyPager<MediaItem> {
    constructor(
        private readonly playlist: MediaPlaylist,
        itemSort: SortParams
    ) {
        super(
            `Users/${embySettings.userId}/Items`,
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

    addItems(additions: readonly MediaItem[]): void {
        additions = this.filterAdditions(additions);
        if (additions.length > 0) {
            this._addItems(additions);
            this.synchAdditions(additions);
        }
    }

    protected connect(): void {
        if (!this.disconnected && !this.connected) {
            super.connect();
            this.subscribeTo(
                this.observeComplete().pipe(
                    switchMap(() => observePlaylistAdditions(this.playlist)),
                    map((items) => this.filterAdditions(items)),
                    filter((items) => items.length > 0),
                    tap((items) => this._addItems(items))
                ),
                logger
            );
        }
    }

    private _addItems(additions: readonly MediaItem[]): void {
        const items = this.items.concat(additions);
        this.size = items.length;
        this.items = items;
        this.updateTrackCount();
    }

    private filterAdditions(additions: readonly MediaItem[]): readonly MediaItem[] {
        return uniqBy('src', additions).filter((item) => !this.keys.has(item.src));
    }

    private async synchAdditions(additions: readonly MediaItem[]) {
        this.busy = true;
        try {
            this.error = undefined;
            const playlistId = getMediaObjectId(this.playlist);
            const ids = additions.map((item) => getMediaObjectId(item));
            await embyApi.addToPlaylist(playlistId, ids);
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
