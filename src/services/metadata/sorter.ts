import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import {Field} from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';

type SortType =
    | '' // default sort
    | 'number' // including dates
    | 'title' // title text (e.g. ignore leading "The")
    | 'locale'; // use `localeCompare`

const sortTypes: Record<Field, SortType> = {
    Index: 'number',
    Track: 'number',
    Disc: 'number',
    Position: 'number',
    Artist: 'title',
    AlbumArtist: 'title',
    Title: 'locale',
    Name: 'title',
    FileName: 'locale',
    IconTitle: 'locale',
    Description: 'locale',
    Album: 'locale',
    AlbumType: '',
    AlbumAndYear: 'locale',
    Duration: 'number',
    FileIcon: '',
    PlayCount: 'number',
    TrackCount: 'number',
    Year: 'number',
    Views: 'number',
    Genre: 'locale',
    Owner: 'locale',
    BitRate: 'number',
    Container: 'locale',
    Copyright: 'locale',
    AddedAt: 'number',
    ModifiedAt: 'number',
    Released: 'number',
    LastPlayed: 'number',
    ListenDate: 'number',
    MultiDisc: '',
    Thumbnail: '',
    Rating: 'number',
    Progress: '',
    Badges: '',
    Country: 'locale',
    ScrobbleStatus: '',
};

function sort<T extends MediaObject>(
    items: readonly T[],
    sortBy: Field,
    sortOrder: 1 | -1
): readonly T[] {
    return items.toSorted((a, b) => compare(a, b, sortBy, sortOrder, sortTypes[sortBy]));
}

export default {sort};

function compare<T extends MediaObject>(
    a: T,
    b: T,
    sortBy: Field,
    sortOrder: 1 | -1,
    sortType?: SortType
): number {
    return (
        syntheticCompare(a, b) ||
        primaryCompare(a, b, sortBy, sortType) * sortOrder ||
        secondaryCompare(a, b)
    );
}

function primaryCompare<T extends MediaObject>(
    a: T,
    b: T,
    sortBy: Field,
    sortType?: SortType
): number {
    switch (sortType) {
        case 'number':
            return getNumber(a, sortBy) - getNumber(b, sortBy);

        case 'title':
            return titleCompare(getText(a, sortBy), getText(b, sortBy));

        case 'locale':
            return localeCompare(getText(a, sortBy), getText(b, sortBy));

        default: {
            const textA = getText(a, sortBy);
            const textB = getText(b, sortBy);
            return textA > textB ? 1 : textA < textB ? -1 : 0;
        }
    }
}

function secondaryCompare<T extends MediaObject>(a: T, b: T): number {
    switch (a.itemType) {
        case ItemType.Album:
            return albumCompare(a, b as MediaAlbum);

        case ItemType.Media:
            return trackCompare(a, b as MediaItem);

        default:
            return titleCompare(a.title, b.title);
    }
}

function syntheticCompare<T extends MediaObject>(a: T, b: T): number {
    return getSyntheticSort(a) - getSyntheticSort(b);
}

function getSyntheticSort<T extends MediaObject>(item: T): number {
    if (item.synthetic) {
        const [, type] = item.src.split(':');
        switch (type) {
            case 'top-tracks':
                return -2;
            case 'other-tracks':
                return 1;
            case 'all-tracks':
                return 2;
            default:
                return -1;
        }
    } else {
        return 0;
    }
}

function getText<T extends MediaObject>(item: T, field: Field): string {
    switch (field) {
        case 'Artist':
            return String(
                (item.itemType === ItemType.Album ? item.artist : (item as MediaItem).artists) || ''
            );
        case 'Title':
        case 'IconTitle':
        case 'Name':
            return item.title || '';
        case 'Description':
            return (item as MediaItem).description || '';
        case 'Album':
        case 'AlbumAndYear':
            return (item as MediaItem).album || '';
        case 'AlbumArtist':
            return (item as MediaItem).albumArtist || '';
        case 'AlbumType':
            return (item as MediaAlbum).albumType || '';
        case 'FileName':
            return (item as MediaItem).fileName || '';
        case 'Genre':
            return String((item as MediaItem).genres || '');
        case 'Owner':
            return (item as MediaItem).owner?.name || '';
        case 'Country':
            return (item as MediaItem).country || (item as MediaItem).countryCode || '';
        case 'Container':
            return (item as MediaItem).container || '';
        case 'MultiDisc':
            return String((item as MediaAlbum).multiDisc || '');
        case 'Copyright':
            return (item as MediaItem).description || '';
        default:
            return '';
    }
}

function getNumber<T extends MediaObject>(item: T, field: Field): number {
    switch (field) {
        case 'AddedAt':
            return item.addedAt || 0;
        case 'ModifiedAt':
            return (item as MediaPlaylist).modifiedAt || 0;
        case 'Track':
            return ((item as MediaItem).disc || 0) * 10_000 + ((item as MediaItem).track || 0);
        case 'Disc':
            return (item as MediaItem).disc || 0;
        case 'Position':
            return (item as MediaItem).position || 0;
        case 'Duration':
            return (item as MediaItem).duration || 0;
        case 'Year':
            return (item as MediaAlbum).year || 0;
        case 'Released':
            return (item as MediaAlbum).releasedAt || 0;
        case 'ListenDate':
        case 'LastPlayed':
            return (item as MediaItem).playedAt || 0;
        case 'PlayCount':
            return (item as MediaItem).playCount || 0;
        case 'Views':
            return (item as MediaItem).globalPlayCount || 0;
        case 'TrackCount':
            return (item as MediaAlbum).trackCount || 0;
        case 'BitRate':
            return (item as MediaItem).bitRate || 0;
        case 'Rating':
            return (item as MediaItem).rating || 0;
        default:
            return 0;
    }
}

function albumCompare(a: MediaAlbum, b: MediaAlbum): number {
    return (
        titleCompare(a.artist, b.artist) ||
        (a.year || 0) - (b.year || 0) ||
        localeCompare(a.title, b.title)
    );
}

function trackCompare(a: MediaItem, b: MediaItem): number {
    return (
        titleCompare(String(a.artists || ''), String(b.artists || '')) ||
        localeCompare(a.album, b.album) ||
        (a.disc === b.disc ? (a.track || 0) - (b.track || 0) : (a.disc || 0) - (b.disc || 0))
    );
}

export function localeCompare(a = '', b = ''): number {
    return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

export function titleCompare(a = '', b = ''): number {
    return localeCompare(a.replace(/^the\s+/i, ''), b.replace(/^the\s+/i, ''));
}
