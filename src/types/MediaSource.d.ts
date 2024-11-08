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
import MediaService from './MediaService';
import MediaSourceLayout from './MediaSourceLayout';
import MediaType from './MediaType';
import Pager from './Pager';

export type MediaSourceComponent<T extends MediaObject> = React.FC<{
    service: MediaService;
    source: MediaSource<T>;
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
    readonly defaultHidden?: boolean;
    readonly disabled?: boolean;
    readonly isPin?: boolean;
    readonly lockActionsStore?: boolean;
    readonly component?: MediaSourceComponent<T>;
    search(params?: MediaFilter | Record<string, unknown>): Pager<T>;
}

export type MediaMultiSource = Pick<
    MediaSource<any>,
    | 'id'
    | 'title'
    | 'icon'
    | 'searchable'
    | 'defaultHidden'
    | 'disabled'
    | 'lockActionsStore'
    | 'component'
> & {
    readonly sources: readonly (
        | MediaSource<MediaAlbum>
        | MediaSource<MediaArtist>
        | MediaSource<MediaItem>
        | MediaSource<MediaFolderItem>
        | MediaSource<MediaPlaylist>
    )[];
};
