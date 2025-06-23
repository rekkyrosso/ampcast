import type React from 'react';
import type {IconName} from 'components/Icon';
import FilterType from './FilterType';
import LinearType from './LinearType';
import MediaAlbum from './MediaAlbum';
import MediaArtist from './MediaArtist';
import MediaFilter from './MediaFilter';
import MediaFolderItem from './MediaFolderItem';
import MediaItem from './MediaItem';
import MediaListLayout from './MediaListLayout';
import MediaListSort from './MediaListSort';
import MediaObject from './MediaObject';
import MediaPlaylist from './MediaPlaylist';
import MediaService from './MediaService';
import MediaType from './MediaType';
import Pager from './Pager';
import {Pinnable} from './Pin';
import SearchParams from './SearchParams';
import SortParams from './SortParams';

export type MediaSourceComponent = React.FC<{
    service: MediaService;
    source: MediaSource<any>;
}>;

export interface MediaSourceItems {
    readonly label?: string; // 'Playlists', 'Songs', etc
    readonly layout?: Partial<MediaListLayout>;
    readonly sort?: MediaListSort;
}

export default interface MediaSource<T extends MediaObject> {
    readonly id: string;
    readonly title: string;
    readonly icon: IconName;
    readonly itemType: T['itemType'];
    readonly mediaType?: T extends MediaItem ? MediaType : never;
    readonly linearType?: T extends MediaItem ? LinearType : never;
    readonly filterType?: FilterType;
    readonly sourceId?: string; // Alternative `id` for settings.
    readonly primaryItems?: MediaSourceItems;
    readonly secondaryItems?: T extends MediaItem ? never : MediaSourceItems;
    readonly tertiaryItems?: T extends MediaArtist ? Exclude<MediaSourceItems, 'sort'> : never;
    readonly searchable?: boolean;
    readonly defaultHidden?: boolean;
    readonly disabled?: boolean;
    readonly isPin?: boolean;
    readonly lockActionsStore?: boolean;
    readonly Component?: MediaSourceComponent;
    search(
        params?: SearchParams | MediaFilter | Record<string, unknown>,
        sort?: SortParams
    ): Pager<T>;
}

export type MediaMultiSource<T extends MediaObject = MediaObject> = Pick<
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
    | MediaSource<Pinnable>
    | MediaMultiSource;
