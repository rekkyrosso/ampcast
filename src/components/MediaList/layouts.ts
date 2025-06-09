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
    'AlbumTrack',
    'Duration',
    'Year',
    'Genre',
    'PlayCount',
    'LastPlayed',
    'Rate',
    'AddedAt',
    'BitRate',
    'Container',
    'Copyright',
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
    details: ['LastPlayed', 'Artist', 'Title', 'Album', 'Duration'],
    extraFields: allMediaItemFields,
};

export const mostPlayedTracksLayout: MediaListLayout = {
    view: 'card',
    card: {...defaultMediaItemCard, data: 'PlayCount'},
    details: ['PlayCount', 'Artist', 'Title', 'Album', 'Duration'],
    extraFields: allMediaItemFields,
};

export const albumTracksLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['AlbumTrack', 'Title', 'Artist', 'Duration'],
    extraFields: allMediaItemFields,
};

export const otherTracksLayout: MediaListLayout = {
    view: 'details',
    card: defaultMediaItemCard,
    details: ['Title', 'Duration', 'Album', 'Track', 'Year'],
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
    extraFields: ['Genre', 'Description', 'AddedAt', 'MultiDisc'],
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
    details: ['Artist', 'Title', 'Album', 'Duration', 'Year', 'Genre', 'AddedAt'],
    extraFields: allMediaItemFields,
};
