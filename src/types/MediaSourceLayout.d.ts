import type {ListViewLayout} from 'components/ListView';
import MediaObject from './MediaObject';

export type Field =
    | 'Index'
    | 'Artist'
    | 'Title'
    | 'IconTitle'
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
    | 'Thumbnail'
    | 'Rate';

export default interface MediaSourceLayout<T extends MediaObject> {
    readonly view: ListViewLayout<T>['view'];
    readonly fields: readonly Field[];
}
