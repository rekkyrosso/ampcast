import ItemType from 'types/ItemType';
import MediaListLayout, {Field} from 'types/MediaListLayout';

export const defaultMediaItemCard: MediaListLayout['card'] = {
    h1: 'Title',
    h2: 'Artist',
    h3: 'AlbumAndYear',
    data: 'Duration',
};

export const allMediaItemFields: readonly Field[] = [
    'Title',
    'Artist',
    'Album',
    'AlbumArtist',
    'Track',
    'Disc',
    'Duration',
    'Year',
    'Genre',
    'PlayCount',
    'LastPlayed',
    'Rating',
    'AddedAt',
    'BitRate',
    'Container',
];

export const allAlbumFields: readonly Field[] = [
    'Title',
    'Artist',
    'Year',
    'TrackCount',
    'AlbumType',
    'Genre',
    'Description',
    'MultiDisc',
    'Copyright',
    'AddedAt',
];

export const mediaItemsLayout: MediaListLayout = {
    view: 'card',
    card: defaultMediaItemCard,
    details: ['Title', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
    extraFields: allMediaItemFields,
};

export const recentlyPlayedTracksLayout: MediaListLayout = {
    view: 'card',
    card: {...defaultMediaItemCard, data: 'LastPlayed'},
    details: ['Title', 'Artist', 'Album', 'Duration', 'LastPlayed'],
    extraFields: allMediaItemFields,
};

export const mostPlayedTracksLayout: MediaListLayout = {
    view: 'card',
    card: {...defaultMediaItemCard, data: 'PlayCount'},
    details: ['Title', 'Artist', 'Album', 'Duration', 'PlayCount'],
    extraFields: allMediaItemFields,
};

export const albumTracksLayout: MediaListLayout = {
    view: 'details',
    card: {...defaultMediaItemCard, index: 'Track'},
    details: ['Track', 'Title', 'Artist', 'Duration'],
    extraFields: allMediaItemFields,
};

export const otherTracksLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Index', 'Title', 'Duration', 'Album', 'Track', 'Year'],
    extraFields: allMediaItemFields,
};

export const radiosLayoutSmall: MediaListLayout = {
    view: 'card minimal',
    views: [],
    card: {h1: 'Name'},
    details: ['Name'],
    extraFields: [],
};

export const songChartsLayout: MediaListLayout = {
    view: 'card',
    card: {
        index: 'Index',
        h1: 'Title',
        h2: 'Artist',
        h3: 'AlbumAndYear',
        data: 'Duration',
    },
    details: ['Index', 'Title', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
    extraFields: allMediaItemFields,
};

export const videosLayout: MediaListLayout = {
    view: 'card compact',
    card: {
        h1: 'Title',
        h2: 'Artist',
        data: 'Duration',
    },
    details: ['Title', 'Artist', 'Duration'],
    extraFields: allMediaItemFields,
};

export const folderItemsLayout: MediaListLayout = {
    view: 'card minimal',
    views: [],
    card: {
        thumb: 'FileIcon',
        h1: 'FileName',
    },
    details: ['FileName'],
    extraFields: ['FileName'],
};

export const albumsLayout: MediaListLayout = {
    view: 'card compact',
    card: {
        h1: 'Title',
        h2: 'Artist',
        h3: 'Year',
    },
    details: ['Title', 'Artist', 'Year', 'TrackCount'],
    extraFields: allAlbumFields,
};

export const recentlyAddedAlbumsLayout: MediaListLayout = {
    ...albumsLayout,
    card: {
        ...albumsLayout.card,
        data: 'AddedAt',
    },
    details: albumsLayout.details.concat('AddedAt'),
};

export const artistsLayout: MediaListLayout = {
    view: 'card compact',
    card: {
        h1: 'Name',
        h2: 'Genre',
    },
    details: ['Name', 'Genre'],
    extraFields: ['Description', 'AddedAt'],
};

export const playlistsLayout: MediaListLayout = {
    view: 'card compact',
    card: {
        h1: 'Name',
        h2: 'Owner',
        h3: 'Progress',
        data: 'TrackCount',
    },
    details: ['Name', 'Owner', 'TrackCount', 'Progress'],
    extraFields: ['Description', 'AddedAt', 'ModifiedAt'],
};

export const playlistItemsLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Title', 'Artist', 'Album', 'Duration', 'Year', 'Genre'],
    extraFields: allMediaItemFields,
};

export function getDefaultLayout(itemType: ItemType): MediaListLayout {
    switch (itemType) {
        case ItemType.Album:
            return albumsLayout;

        case ItemType.Artist:
            return artistsLayout;

        case ItemType.Folder:
            return folderItemsLayout;

        case ItemType.Media:
            return mediaItemsLayout;

        case ItemType.Playlist:
            return playlistsLayout;
    }
}
