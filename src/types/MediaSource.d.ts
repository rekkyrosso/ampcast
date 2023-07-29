import type {IconName} from 'components/Icon';
import ItemType from './ItemType';
import MediaFilter from './MediaFilter';
import MediaObject from './MediaObject';
import MediaSourceLayout from './MediaSourceLayout';
import MediaType from './MediaType';
import Pager from './Pager';
import ViewType from './ViewType';

export default interface MediaSource<T extends MediaObject> {
    readonly id: string;
    readonly title: string;
    readonly icon: IconName;
    readonly itemType: T['itemType'];
    readonly mediaType?: T['itemType'] extends ItemType.Media ? MediaType : never;
    readonly viewType?: ViewType;
    readonly layout?: MediaSourceLayout<T>;
    readonly secondaryLayout?: MediaSourceLayout<MediaObject>;
    readonly tertiaryLayout?: MediaSourceLayout<MediaObject>;
    readonly searchable?: boolean;
    readonly defaultHidden?: boolean;
    readonly isPin?: boolean;
    readonly lockActionsStore?: boolean;
    search(params?: MediaFilter | Record<string, unknown>): Pager<T>;
}
