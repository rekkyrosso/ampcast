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
    | 'Rate';

type MediaSourceLayout<T extends MediaObject> =
    | {
          readonly view: 'none';
      }
    | {
          readonly view: ListViewLayout<T>['view'];
          readonly fields: readonly Field[];
      };

export default MediaSourceLayout;
