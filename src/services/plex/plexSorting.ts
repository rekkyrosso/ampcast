import MediaListSort from 'types/MediaListSort';

export const plexTracksSortMap: Record<string, string> = {
    Title: 'titleSort',
    Album: 'album.titleSort',
    AlbumArtist: 'artist.titleSort',
};

export const plexTracksSort: MediaListSort = {
    sortOptions: {
        Title: 'Title',
        Album: 'Album',
        AlbumArtist: 'Album Artist',
    },
    defaultSort: {
        sortBy: 'AlbumArtist',
        sortOrder: 1,
    },
};

export const plexAlbumsSortMap: Record<string, string> = {
    Title: 'titleSort',
    Artist: 'artist.titleSort',
    Year: 'year',
};

export const plexAlbumsSort: MediaListSort = {
    sortOptions: {
        Title: 'Title',
        Artist: 'Artist',
        Year: 'Year',
    },
    defaultSort: {
        sortBy: 'Artist',
        sortOrder: 1,
    },
};

export const plexArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        Title: 'Title',
        Year: 'Year',
    },
    defaultSort: {
        sortBy: 'Year',
        sortOrder: -1,
    },
};

export const plexPlaylistsSortMap: Record<string, string> = {
    Name: 'titleSort',
    AddedAt: 'addedAt',
};

export const plexPlaylistItemsSort: MediaListSort = {
    defaultSort: {
        sortBy: 'Position',
        sortOrder: 1,
    },
};

export function getAlbumSort({sortBy, sortOrder} = plexAlbumsSort.defaultSort) {
    sortBy = plexAlbumsSortMap[sortBy] || sortBy;
    return `${sortBy}:${sortOrder === -1 ? 'desc' : 'asc'}${
        sortBy === 'artist.titleSort'
            ? ',album.titleSort,album.index,album.id,album.originallyAvailableAt'
            : ''
    }`;
}

export function getTrackSort({sortBy, sortOrder} = plexTracksSort.defaultSort) {
    sortBy = plexTracksSortMap[sortBy] || sortBy;
    return `${sortBy}:${sortOrder === -1 ? 'desc' : 'asc'}${
        sortBy === 'artist.titleSort'
            ? ',album.titleSort,album.year,track.absoluteIndex,track.index,track.titleSort,track.id'
            : ''
    }`;
}

export function getPlaylistSort(
    {sortBy, sortOrder} = {
        sortBy: 'Name',
        sortOrder: 1,
    }
) {
    sortBy = plexPlaylistsSortMap[sortBy] || sortBy;
    return `${sortBy}:${sortOrder === -1 ? 'desc' : 'asc'}`;
}
