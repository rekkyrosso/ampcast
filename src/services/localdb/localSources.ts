import {distinctUntilChanged, map} from 'rxjs';
import MiniSearch from 'minisearch';
import ItemType from 'types/ItemType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaServiceId, {ScrobblerId} from 'types/MediaServiceId';
import MediaSource, {AnyMediaSource, MediaMultiSource, MediaSourceItems} from 'types/MediaSource';
import Pager from 'types/Pager';
import {observePlaybackState} from 'services/mediaPlayback/playback';
import {localeCompare} from 'services/metadata';
import ObservablePager from 'services/pagers/ObservablePager';
import WrappedPager from 'services/pagers/WrappedPager';
import {recentlyPlayedTracksLayout} from 'components/MediaList/layouts';
import {localPlaylistItemsSort, localPlaylistsSort} from './localSorting';
import {isRecentListen, observeListens} from './listens';
import playlists, {LocalPlaylistItem} from './playlists';
import UnscrobbledBrowser from './components/UnscrobbledBrowser';

const serviceId: MediaServiceId = 'localdb';

export const localPlaylistLayout: Partial<MediaListLayout> = {
    card: {
        h1: 'Name',
        h2: 'Description',
        data: 'TrackCount',
    },
    details: ['Name', 'Description', 'TrackCount'],
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
    icon: 'search',
    itemType: ItemType.Media,
    searchable: true,
    searchPlaceholder: 'Search playback history',
    primaryItems: {
        layout: addIconToLayout(recentlyPlayedTracksLayout),
        itemKey: 'playedAt',
    },

    search({q = ''}: {q?: string} = {}): Pager<MediaItem> {
        const listens$ = observeListens();
        if (q) {
            return new ObservablePager(
                listens$.pipe(
                    map((listens) => {
                        const listensMap = new Map(
                            listens.toReversed().map((listen) => [listen.src, listen])
                        );
                        const fields = ['title', 'artist', 'album', 'genre', 'src'];
                        const miniSearch = new MiniSearch({fields});
                        miniSearch.addAll(
                            [...listensMap.values()].map((listen) => ({
                                id: listen.src,
                                title: listen.title,
                                artist: listen.artists?.join(';') || '',
                                album: listen.album || '',
                                genre: listen.genres,
                                src: listen.src,
                            }))
                        );
                        return miniSearch
                            .search(q, {
                                fields,
                                fuzzy: 0.2,
                                prefix: true,
                                boost: {title: 1.05, album: 0.5, genres: 0.25, src: 0.1},
                            })
                            .map((entry) => listensMap.get(entry.id)!);
                    })
                ),
                {passive: true}
            );
        } else {
            const nowPlaying$ = observePlaybackState().pipe(
                map(({paused, currentTime, currentItem}) =>
                    currentItem && (!paused || currentTime > 1) ? [currentItem] : []
                ),
                distinctUntilChanged(([a], [b]) => a?.id === b?.id),
                map((items) => items.map((item) => ({...item, playedAt: -1})))
            );
            const listensPager = new ObservablePager(listens$, {passive: true});
            const nowPlayingPager = new ObservablePager<MediaItem>(nowPlaying$, {passive: true});
            return new WrappedPager(nowPlayingPager, listensPager);
        }
    },
};

export const localPlaylists: MediaSource<MediaPlaylist> = {
    id: `${serviceId}/playlists`,
    title: 'Playlists',
    icon: 'playlist',
    itemType: ItemType.Playlist,
    primaryItems: {
        layout: localPlaylistLayout,
        sort: localPlaylistsSort,
    },
    secondaryItems: localPlaylistItems,

    search(
        _,
        {sortBy, sortOrder} = localPlaylists.primaryItems!.sort!.defaultSort
    ): Pager<MediaPlaylist> {
        return playlists.search(
            {
                sort: (a, b) => {
                    switch (sortBy) {
                        case 'Name':
                            return localeCompare(a.title, b.title) * sortOrder;

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

const unscrobbled: MediaMultiSource = {
    id: `${serviceId}/unscrobbled`,
    title: 'Unscrobbled',
    icon: 'scrobble',
    defaultHidden: true,
    Component: UnscrobbledBrowser as any,
    sources: [
        createUnscrobbled('lastfm', 'last.fm'),
        createUnscrobbled('listenbrainz', 'ListenBrainz'),
    ],
};

const localSources: readonly AnyMediaSource[] = [localPlaylists, unscrobbled];

export default localSources;

function createUnscrobbled(scrobblerId: ScrobblerId, title: string): MediaSource<MediaItem> {
    return {
        id: `${serviceId}/${scrobblerId}/unscrobbled`,
        sourceId: `${serviceId}/unscrobbled`,
        title,
        icon: 'scrobble',
        itemType: ItemType.Media,
        primaryItems: {
            layout: {
                view: 'details',
                details: [
                    'ListenDate',
                    'ScrobbleStatus',
                    'IconTitle',
                    'Artist',
                    'Album',
                    'Duration',
                ],
                views: [],
            },
            itemKey: 'playedAt',
            emptyMessage: 'No unscrobbled tracks',
        },

        search(): Pager<Listen> {
            const scrobbledAt = `${scrobblerId}ScrobbledAt` as keyof Listen;
            return new ObservablePager(
                observeListens().pipe(
                    map((listens) =>
                        listens.filter((listen) => !listen[scrobbledAt] && isRecentListen(listen))
                    )
                ),
                {passive: true}
            );
        },
    };
}

function addIconToLayout(layout: MediaListLayout): MediaListLayout {
    return {
        ...layout,
        card: {...layout.card, h1: 'IconTitle'},
        details: layout.details.map((field) => (field === 'Title' ? 'IconTitle' : field)),
    };
}
