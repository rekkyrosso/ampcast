import MediaListSort from 'types/MediaListSort';

export const localPlaylistsSort: MediaListSort = {
    sortOptions: {
        Name: 'Name',
        ModifiedAt: 'Date Modified',
    },
    defaultSort: {
        sortBy: 'ModifiedAt',
        sortOrder: -1,
    },
};

export const localPlaylistItemsSort: MediaListSort = {
    sortOptions: {
        Position: 'Position',
        IconTitle: 'Title',
        Artist: 'Artist',
    },
    defaultSort: {
        sortBy: 'Position',
        sortOrder: 1,
    },
};
