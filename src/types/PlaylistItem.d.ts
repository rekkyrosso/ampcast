import MediaItem from './MediaItem';
import LookupStatus from './LookupStatus';

export default interface PlaylistItem extends MediaItem {
    readonly id: string;
    readonly lookupStatus?: LookupStatus;
}
