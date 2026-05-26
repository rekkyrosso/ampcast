import MediaListSort from 'types/MediaListSort';

export const navidromeSongsSortMap: Record<string, string> = {
    Position: 'id',
    Title: 'title',
    Artist: 'artist',
    Album: 'album',
    AlbumArtist: 'albumArtist',
};

export const navidromeAlbumsSortMap: Record<string, string> = {
    Title: 'name',
    Artist: 'albumArtist',
    Year: 'max_year',
};

export const navidromeArtistsSortMap: Record<string, string> = {
    Name: 'name',
};

export const navidromePlaylistsSortMap: Record<string, string> = {
    Name: 'name',
    ModifiedAt: 'updatedAt',
};

export const navidromeRadiosSortMap: Record<string, string> = {
    Name: 'name',
    AddedAt: 'createdAt',
};

export const navidromePlaylistsSort: MediaListSort = {
    sortOptions: {
        Name: 'Name',
        ModifiedAt: 'Date Modified',
    },
    defaultSort: {
        sortBy: 'ModifiedAt',
        sortOrder: -1,
    },
};

export const navidromePlaylistItemsSort: MediaListSort = {
    sortOptions: {
        Position: 'Position',
        Title: 'Title',
        Artist: 'Artist',
    },
    defaultSort: {
        sortBy: 'Position',
        sortOrder: 1,
    },
};

export const navidromeRadiosSort: MediaListSort = {
    sortOptions: {
        Name: 'Name',
        AddedAt: 'Date Added',
    },
    defaultSort: {
        sortBy: 'AddedAt',
        sortOrder: -1,
    },
};

export const navidromeArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        Title: 'Title',
        Year: 'Year',
    },
    defaultSort: {
        sortBy: 'Year',
        sortOrder: -1,
    },
};
