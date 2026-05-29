import MediaListSort from 'types/MediaListSort';
import SortParams from 'types/SortParams';

export const jellyfinSongsSortMap: Record<string, string> = {
    Title: 'SortName',
    Artist: 'Artist,Album,SortName',
    Album: 'Album,SortName',
    AlbumArtist: 'AlbumArtist,Album,SortName',
};

export const jellyfinSongsSort: MediaListSort = {
    sortOptions: {
        Title: 'Title',
        Artist: 'Artist',
        Album: 'Album',
        AlbumArtist: 'Album Artist',
    },
    defaultSort: {
        sortBy: 'AlbumArtist',
        sortOrder: 1,
    },
};

export const jellyfinAlbumsSortMap: Record<string, string> = {
    Title: 'SortName',
    Artist: 'AlbumArtist,SortName',
    Year: 'ProductionYear,PremiereDate,AlbumArtist,Album,SortName',
};

export const jellyfinAlbumsSort: MediaListSort = {
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

export const jellyfinArtistAlbumsSortMap: Record<string, string> = {
    Title: 'SortName',
    Year: 'ProductionYear,PremiereDate,SortName',
};

export const jellyfinArtistAlbumsSort: MediaListSort = {
    sortOptions: {
        Title: 'Title',
        Year: 'Year',
    },
    defaultSort: {
        sortBy: 'Year',
        sortOrder: -1,
    },
};

export const jellyfinPlaylistsSortMap: Record<string, string> = {
    Name: 'SortName',
    '': 'DateCreated,SortName',
};

export const jellyfinPlaylistItemsSortMap: Record<string, string> = {
    Position: 'ListItemOrder',
    Title: 'SortName',
    Artist: 'Artist,Album,ParentIndexNumber,IndexNumber,SortName',
};

export const jellyfinPlaylistItemsSort: MediaListSort = {
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

export function getSortParams(
    {sortBy, sortOrder}: SortParams,
    sortMap: Record<string, string>
): {
    SortBy: string;
    SortOrder: string;
} {
    sortBy = sortMap[sortBy] || sortBy;
    return {
        SortBy: sortBy,
        SortOrder:
            sortOrder === 1
                ? 'Ascending'
                : // Pad with 'Ascending'.
                  sortBy
                      .split(',')
                      .map((sortBy, index, keys) =>
                          index === 1 &&
                          (keys[0] === 'ProductionYear' || keys[0] === 'PremiereDate') &&
                          (sortBy === 'ProductionYear' || sortBy === 'PremiereDate')
                              ? 'Descending'
                              : index === 0
                                ? 'Descending'
                                : 'Ascending'
                      )
                      .join(','),
    };
}
