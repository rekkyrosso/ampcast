import {Except} from 'type-fest';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import SimplePager from 'services/SimplePager';
import JellyfinPager from './JellyfinPager';
import settings from './jellyfinSettings';
import {observeIsLoggedIn, login, logout} from './jellyfinAuth';
import './jellyfinReporting';

console.log('module::jellyfin');

const defaultLayout: MediaSourceLayout<MediaItem> = {
    view: 'details',
    fields: ['Artist', 'Title', 'Album', 'Track', 'Duration', 'Genre', 'PlayCount'],
};

function search<T extends MediaObject>(q: string, type = 'Audio'): Pager<T> {
    if (q) {
        return createJellyfinItemsPager({
            SearchTerm: q,
            IncludeItemTypes: type,
        });
    } else {
        return new SimplePager<T>();
    }
}

const jellyfinLikedSongs: MediaSource<MediaItem> = {
    id: 'jellyfin/liked-songs',
    title: 'Liked Songs',
    icon: 'heart',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createJellyfinItemsPager({
            Filters: 'IsFavorite',
        });
    },
};

const jellyfinLikedAlbums: MediaSource<MediaAlbum> = {
    id: 'jellyfin/liked-albums',
    title: 'Liked Albums',
    icon: 'heart',
    itemType: ItemType.Album,

    search(): Pager<MediaAlbum> {
        return createJellyfinItemsPager({
            Filters: 'IsFavorite',
            IncludeItemTypes: 'MusicAlbum',
        });
    },
};

const jellyfinRecentlyPlayed: MediaSource<MediaItem> = {
    id: 'jellyfin/recently-played',
    title: 'Recently Played',
    icon: 'clock',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createJellyfinItemsPager({
            SortBy: 'DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const jellyfinMostPlayed: MediaSource<MediaItem> = {
    id: 'jellyfin/most-played',
    title: 'Most Played',
    icon: 'most-played',
    itemType: ItemType.Media,
    layout: defaultLayout,

    search(): Pager<MediaItem> {
        return createJellyfinItemsPager({
            SortBy: 'PlayCount,DatePlayed',
            SortOrder: 'Descending',
            Filters: 'IsPlayed',
        });
    },
};

const jellyfinPlaylists: MediaSource<MediaPlaylist> = {
    id: 'jellyfin/playlists',
    title: 'Playlists',
    icon: 'playlists',
    itemType: ItemType.Playlist,
    layout: {
        view: 'card compact',
        fields: ['Thumbnail', 'Title', 'TrackCount'],
    },
    secondaryLayout: defaultLayout,

    search(): Pager<MediaPlaylist> {
        return createJellyfinItemsPager({
            SortBy: 'SortName',
            SortOrder: 'Ascending',
            IncludeItemTypes: 'Playlist',
        });
    },
};

function createJellyfinItemsPager<T extends MediaObject>(params: Record<string, string>): Pager<T> {
    return new JellyfinPager(`Users/${settings.userId}/Items`, params);
}

const jellyfin: MediaService = {
    id: 'jellyfin',
    title: 'Jellyfin',
    icon: 'jellyfin',
    searches: [
        createSearch('Audio', {title: 'Songs', itemType: ItemType.Media}),
        createSearch('MusicAlbum', {title: 'Albums', itemType: ItemType.Album}),
        {
            id: 'Artist',
            title: 'Artists',
            icon: '',
            itemType: ItemType.Artist,
            searchable: true,

            search(q: string): Pager<MediaArtist> {
                if (q) {
                    return new JellyfinPager(`Artists`, {
                        searchTerm: q,
                    });
                } else {
                    return new SimplePager<MediaArtist>();
                }
            },
        },
        createSearch('Playlist', {title: 'Playlists', itemType: ItemType.Playlist}),
    ],
    sources: [
        jellyfinMostPlayed,
        jellyfinRecentlyPlayed,
        jellyfinLikedSongs,
        jellyfinLikedAlbums,
        jellyfinPlaylists,
    ],

    observeIsLoggedIn,
    login,
    logout,
};

function createSearch<T extends MediaObject>(
    searchType: string,
    props: Except<MediaSource<T>, 'id' | 'icon' | 'search'>
): MediaSource<T> {
    return {
        ...props,
        id: searchType,
        icon: '',
        searchable: true,

        search(q: string): Pager<T> {
            return search(q, searchType);
        },
    };
}

export default jellyfin;
