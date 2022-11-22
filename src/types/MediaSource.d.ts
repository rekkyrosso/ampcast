import type IconName from 'components/Icon';
import MediaSourceLayout from './MediaSourceLayout';
import Pager from './Pager';

export default interface MediaSource<T> {
    readonly id: string;
    readonly title: string;
    readonly icon: IconName;
    readonly itemType: T['itemType'];
    readonly layout?: MediaSourceLayout;
    readonly secondaryLayout?: MediaSourceLayout;
    readonly tertiaryLayout?: MediaSourceLayout;
    readonly searchable?: boolean;
    readonly unplayable?: boolean;
    readonly defaultHidden?: boolean;
    search(params?: Record<string, unknown>): Pager<T>;
}
