import type {ListViewLayout} from 'components/ListView';
import MediaObject from './MediaObject';

export type Field =
    | 'Index'
    | 'Artist'
    | 'Title'
    | 'PinTitle'
    | 'Description'
    | 'Album'
    | 'AlbumArtist'
    | 'AlbumTrack'
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
    | 'AddedAt'
    | 'LastPlayed'
    | 'ListenDate'
    | 'Thumbnail'
    | 'Rate'
    | 'Progress';

type MediaSourceLayout<T extends MediaObject> =
    | {
          readonly view: 'none';
      }
    | {
          readonly view: ListViewLayout<T>['view'];
          readonly fields: readonly Field[];
      };

export default MediaSourceLayout;
