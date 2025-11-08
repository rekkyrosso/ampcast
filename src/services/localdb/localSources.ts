import {map} from 'rxjs';
import MiniSearch from 'minisearch';
import unidecode from 'unidecode';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import ObservablePager from 'services/pagers/ObservablePager';
import {recentlyPlayedTracksLayout} from 'components/MediaList/layouts';
import {observeListens} from './listens';
import playlists, {LocalPlaylistItem} from './playlists';

const serviceId: MediaServiceId = 'localdb';

export const localPlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Description',
        data: 'TrackCount',
    },
    details: ['Name', 'Description', 'TrackCount'],
};

export const localPlaylistItemsSort: MediaListSort = {
    sortOptions: {
        position: 'Position',
        title: 'Title',
        artist: 'Artist',
    },
    defaultSort: {
        sortBy: 'position',
        sortOrder: 1,
    },
};

export const localPlaylistItems: MediaSourceItems<LocalPlaylistItem> = {
    layout: {
        card: {
            h1: 'IconTitle',
            h2: 'Artist',
            h3: 'AlbumAndYear',
            data: 'Duration',
        },
        details: ['Position', 'IconTitle', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
    },
    sort: localPlaylistItemsSort,
    itemKey: 'id',
};

export const localScrobbles: MediaSource<MediaItem> = {
    id: `${serviceId}/scrobbles`,
    title: 'Scrobbles',
    icon: 'clock',
    itemType: ItemType.Media,
    searchable: true,
    searchPlaceholder: 'Search playback history',
    primaryItems: {
        layout: addIconToLayout(recentlyPlayedTracksLayout),
        itemKey: 'playedAt',
    },

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        return new ObservablePager(
            observeListens().pipe(
                map((listens) => {
                    if (q) {
                        const listensMap = new Map(
                            listens.toReversed().map((listen) => [listen.src, listen])
                        );
                        const fields = ['title', 'artists', 'genres', 'src'];
                        const miniSearch = new MiniSearch({fields});
                        miniSearch.addAll(
                            [...listensMap.values()].map((listen) => ({
                                id: listen.src,
                                title: unidecode(listen.title),
                                artists: listen.artists?.map((artist) => unidecode(artist)),
                                genres: listen.genres,
                                src: listen.src,
                            }))
                        );
                        return miniSearch
                            .search(unidecode(q), {
                                fields,
                                fuzzy: 0.2,
                                prefix: true,
                                boost: {title: 2, genres: 0.25, src: 0.1},
                            })
                            .map((entry) => listensMap.get(entry.id)!);
                    } else {
                        return listens;
                    }
                })
            ),
            {passive: true}
        );
    },
};

export const localPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: localPlaylistLayout,
        sort: {
            sortOptions: {
                title: 'Name',
                modifiedAt: 'Date Modified',
            },
            defaultSort: {
                sortBy: 'modifiedAt',
                sortOrder: -1,
            },
        },
    },
    secondaryItems: localPlaylistItems,

    search(
        _,
        {sortBy, sortOrder} = localPlaylists.primaryItems!.sort!.defaultSort
    ): Pager<MediaPlaylist> {
        return playlists.createPager(
            {
                sort: (a, b) => {
                    switch (sortBy) {
                        case 'title':
                            return (
                                a.title.localeCompare(b.title, undefined, {sensitivity: 'base'}) *
                                sortOrder
                            );
                        default:
                            return ((a.modifiedAt || 0) - (b.modifiedAt || 0)) * sortOrder;
                    }
                },
            },
            {
                childSort: localPlaylistItemsSort.defaultSort,
                childSortId: `${localPlaylists.id}/2`,
            }
        );
    },
};

const localSources: readonly AnyMediaSource[] = [localPlaylists];

export default localSources;

function addIconToLayout(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        card: {...layout.card, h1: 'IconTitle'},
        details: layout.details.map((field) => (field === 'Title' ? 'IconTitle' : field)),
    };
}
