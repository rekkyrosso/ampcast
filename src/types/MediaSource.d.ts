import type React from 'react';
import type {IconName} from 'components/Icon';
import ChildOf from './ChildOf';
import FilterType from './FilterType';
import ItemType from './ItemType';
import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFilter from './MediaFilter';
import MediaFolderItem from './MediaFolderItem';
import MediaItem from './MediaItem';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';
import MediaSearchParams from './MediaSearchParams';
import MediaService from './MediaService';
import MediaSourceLayout from './MediaSourceLayout';
import MediaType from './MediaType';
import Pager from './Pager';

export type MediaSourceComponent = React.FC<{
    service: MediaService;
    source: AnyMediaSource;
}>;

export default interface MediaSource<T extends MediaObject> {
    readonly id: string;
    readonly title: string;
    readonly icon: IconName;
    readonly itemType: T['itemType'];
    readonly mediaType?: T['itemType'] extends ItemType.Media ? MediaType : never;
    readonly filterType?: FilterType;
    readonly layout?: MediaSourceLayout<T>;
    readonly secondaryLayout?: MediaSourceLayout<ChildOf<T>>;
    readonly tertiaryLayout?: MediaSourceLayout<ChildOf<ChildOf<T>>>;
    readonly searchable?: boolean;
    readonly sortOptions?: Record<string, string>;
    readonly defaultSort?: Pick<MediaSearchParams, 'sortBy', 'sortOrder'>;
    readonly defaultHidden?: boolean;
    readonly disabled?: boolean;
    readonly isPin?: boolean;
    readonly lockActionsStore?: boolean;
    readonly Component?: MediaSourceComponent<T>;
    search(params?: MediaSearchParams | MediaFilter | Record<string, unknown>): Pager<T>;
}

export type MediaMultiSource<T extends MediaObject = any> = Pick<
    MediaSource<T>,
    | 'id'
    | 'title'
    | 'icon'
    | 'searchable'
    | 'defaultHidden'
    | 'disabled'
    | 'lockActionsStore'
    | 'Component'
> & {isPin?: false} & (T extends MediaAlbum
        ? {
              readonly sources: readonly MediaSource<MediaAlbum>[];
          }
        : T extends MediaArtist
        ? {
              readonly sources: readonly MediaSource<MediaArtist>[];
          }
        : T extends MediaItem
        ? {
              readonly sources: readonly MediaSource<MediaItem>[];
          }
        : T extends MediaPlaylist
        ? {
              readonly sources: readonly MediaSource<MediaPlaylist>[];
          }
        : {
              readonly sources: readonly (
                  | MediaSource<MediaAlbum>
                  | MediaSource<MediaArtist>
                  | MediaSource<MediaItem>
                  | MediaSource<MediaPlaylist>
              )[];
          });

export type AnyMediaSource =
    | MediaSource<MediaAlbum>
    | MediaSource<MediaArtist>
    | MediaSource<MediaItem>
    | MediaSource<MediaFolderItem>
    | MediaSource<MediaPlaylist>
    | MediaMultiSource;
