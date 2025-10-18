import {SetRequired} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaListSort from 'types/MediaListSort';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import {mediaItemsLayout, recentlyPlayedTracksLayout} from 'components/MediaList/layouts';
import listens from './listens';
import playlists from './playlists';

const serviceId: MediaServiceId = 'localdb';

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

export const localPlaylistItems: MediaSourceItems<SetRequired<MediaItem, 'position'>> = {
    layout: {
        ...addIcon(mediaItemsLayout),
        view: 'details',
        details: ['Position', 'IconTitle', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
    },
    sort: localPlaylistItemsSort,
    itemKey: 'position',
};

export const localScrobbles: MediaSource<MediaItem> = {
    id: `${serviceId}/scrobbles`,
    title: 'Scrobbles',
    icon: 'clock',
    itemType: ItemType.Media,
    // searchable: true,
    searchPlaceholder: 'Search playback history',
    primaryItems: {
        layout: addIcon(recentlyPlayedTracksLayout),
        itemKey: 'playedAt',
    },

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        return listens.search(q);
    },
};

export const localPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        sort: {
            sortOptions: {
                title: 'Name',
                modifiedAt: 'Date Edited',
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
                            return (a.modifiedAt || 0 - (b.modifiedAt || 0)) * sortOrder;
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

function addIcon(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        card: {...layout.card, h1: 'IconTitle'},
        details: layout.details.map((field) => (field === 'Title' ? 'IconTitle' : field)),
        extraFields: layout.extraFields?.map((field) => (field === 'Title' ? 'IconTitle' : field)),
    };
}
