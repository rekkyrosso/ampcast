import MediaListLayout, {Field} from 'types/MediaListLayout';

export const defaultMediaItemCard: MediaListLayout['card'] = {
    h1: 'Title',
    h2: 'Artist',
    h3: 'AlbumAndYear',
    data: 'Duration',
};

const allMediaItemFields: readonly Field[] = [
    'Artist',
    'Title',
    'Album',
    'Track',
    'Duration',
    'Year',
    'Genre',
    'PlayCount',
    'LastPlayed',
    'Rate',
    'AddedAt',
    'BitRate',
    'Container',
];

const allAlbumFields: readonly Field[] = [
    'Artist',
    'Title',
    'Year',
    'TrackCount',
    'Genre',
    'Description',
    'MultiDisc',
    'Copyright',
    'AddedAt',
];

export const mediaItemsLayout: MediaListLayout = {
    view: 'card',
    card: defaultMediaItemCard,
    details: ['Artist', 'Title', 'Album', 'Duration', 'Year', 'Genre'],
    extraFields: allMediaItemFields,
};

export const recentlyPlayedTracksLayout: MediaListLayout = {
    view: 'card',
    card: {...defaultMediaItemCard, data: 'LastPlayed'},
    details: ['Artist', 'Title', 'Album', 'Duration', 'LastPlayed'],
    extraFields: allMediaItemFields,
};

export const mostPlayedTracksLayout: MediaListLayout = {
    view: 'card',
    card: {...defaultMediaItemCard, data: 'PlayCount'},
    details: ['Artist', 'Title', 'Album', 'Duration', 'PlayCount'],
    extraFields: allMediaItemFields,
};

export const albumTracksLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Track', 'Title', 'Artist', 'Duration'],
    extraFields: allMediaItemFields,
};

export const otherTracksLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Index', 'Title', 'Duration', 'Album', 'Track', 'Year'],
    extraFields: allMediaItemFields,
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
    details: ['Index', 'Artist', 'Title', 'Album', 'Duration', 'Year', 'Genre'],
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
    details: ['Artist', 'Title', 'Year', 'TrackCount'],
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
    extraFields: ['Description', 'AddedAt'],
};

export const playlistItemsLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Artist', 'Title', 'Album', 'Duration', 'Year', 'Genre'],
    extraFields: allMediaItemFields,
};
