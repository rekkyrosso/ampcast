import type {ListViewLayout} from 'components/ListView';
import MediaObject from './MediaObject';

export type Field =
    | 'Index'
    | 'Artist'
    | 'Title'
    | 'Blurb'
    | 'Album'
    | 'AlbumArtist'
    | 'AlbumAndYear'
    | 'Track'
    | 'Duration'
    | 'FileIcon'
    | 'FileName'
    | 'PlayCount'
    | 'TrackCount'
    | 'Views'
    | 'Year'
    | 'Genre'
    | 'Owner'
    | 'LastPlayed'
    | 'ListenDate'
    | 'Thumbnail';

export default interface MediaSourceLayout<T extends MediaObject> {
    readonly view: ListViewLayout<T>['view'];
    readonly fields: readonly Field[];
}
