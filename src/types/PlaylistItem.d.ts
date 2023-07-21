import MediaItem from './MediaItem';
import LookupStatus from './LookupStatus';
import UserData from './UserData';

type Subtract<T, V> = Pick<T, Exclude<keyof T, keyof V>>;

type PlaylistItem = Subtract<MediaItem, UserData> & {
    readonly id: string;
    readonly lookupStatus?: LookupStatus;
};

export default PlaylistItem;
