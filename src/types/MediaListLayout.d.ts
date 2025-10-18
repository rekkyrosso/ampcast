import type {ListViewLayout} from 'components/ListView';

export type Field =
    | 'Index'
    | 'Artist'
    | 'Title'
    | 'Name'
    | 'IconTitle'
    | 'Description'
    | 'Album'
    | 'AlbumArtist'
    | 'AlbumAndYear'
    | 'AlbumType'
    | 'Track'
    | 'Position'
    | 'Duration'
    | 'FileIcon'
    | 'FileName'
    | 'PlayCount'
    | 'TrackCount'
    | 'Views'
    | 'Year'
    | 'Genre'
    | 'Owner'
    | 'MultiDisc'
    | 'Copyright'
    | 'AddedAt'
    | 'Released'
    | 'LastPlayed'
    | 'ListenDate'
    | 'BitRate'
    | 'Container'
    | 'Thumbnail'
    | 'Rate'
    | 'Progress';

export interface CardView {
    readonly index?: 'Index' | 'Track' | 'Position';
    readonly thumb?: 'Thumbnail' | 'FileIcon';
    readonly h1: Field;
    readonly h2?: Field;
    readonly h3?: Field;
    readonly data?: Field;
}

export interface DetailsView {
    readonly fields: readonly Field[];
}

export default interface MediaListLayout {
    readonly card: CardView;
    readonly details: readonly Field[];
    readonly extraFields?: readonly Field[]; // Can overlap with `details`.
    readonly view: ListViewLayout<T>['view'] | 'none';
    readonly views?: readonly ListViewLayout<T>['view'][];
}
