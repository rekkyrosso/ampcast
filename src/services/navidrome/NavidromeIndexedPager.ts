import MiniSearch from 'minisearch';
import {Primitive} from 'type-fest';
import MediaObject from 'types/MediaObject';
import {PagerConfig} from 'types/Pager';
import {getSourceSorting} from 'services/mediaServices/servicesSettings';
import {CreateChildPager} from 'services/pagers/MediaPager';
import IndexedPager from 'services/pagers/IndexedPager';
import navidromeApi from './navidromeApi';
import navidromeSettings from './navidromeSettings';
import {createMediaObject} from './navidromeUtils';

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
