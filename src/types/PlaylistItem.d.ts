import LookupStatus from './LookupStatus';
import MediaItem from './MediaItem';
import Subtract from './Subtract';
import UserData from './UserData';

type PlaylistItem = Subtract<MediaItem, UserData> & {
    readonly id: string;
    readonly lookupStatus?: LookupStatus;
};

export default PlaylistItem;
