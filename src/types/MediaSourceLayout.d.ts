import type {ListViewLayout} from 'components/ListView'
import MediaObject from './MediaObject';

export type Field =
    | 'Index'
    | 'Artist'
    | 'Title'
    | 'Album'
    | 'AlbumAndYear'
    | 'Track'
    | 'Duration'
    | 'PlayCount'
    | 'TrackCount'
    | 'Year'
    | 'Genre'
    | 'Owner'
    | 'LastPlayed'
    | 'Thumbnail';

export default interface MediaSourceLayout<T extends MediaObject> {
    readonly view: ListViewLayout<T>['view'];
    readonly fields: readonly Field[];
}
