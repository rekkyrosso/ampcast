import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import Pager from './Pager';

export default interface MediaPlaylist extends BaseMediaObject<ItemType.Playlist> {
    readonly pager: Pager<MediaItem>;
    readonly trackCount?: number;
    readonly duration?: number;
    readonly playedAt?: number; // UTC
    readonly modifiedAt?: number; // UTC
    readonly description?: string;
    readonly unplayable?: boolean;
}
