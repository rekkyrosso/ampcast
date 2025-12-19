import MiniSearch from 'minisearch';
import unidecode from 'unidecode';
import type {BaseItemDto} from '@jellyfin/sdk/lib/generated-client/models';
import {Primitive} from 'type-fest';
import MediaObject from 'types/MediaObject';
import {Page, PagerConfig} from 'types/Pager';
import ParentOf from 'types/ParentOf';
import {uniqBy} from 'utils';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import embySettings from './embySettings';
import embyApi from './embyApi';
import {createMediaObject} from './embyUtils';

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
