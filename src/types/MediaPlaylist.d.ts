import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import Pager from './Pager';

export default interface MediaPlaylist extends BaseMediaObject {
    readonly itemType: ItemType.Playlist;
    readonly pager: Pager<MediaItem>;
    // Everything below here should be optional
    readonly isOwn?: boolean;
    readonly owner?: {
        readonly name: string;
        readonly url?: string;
    };
    readonly trackCount?: number;
    readonly duration?: number;
    readonly playedAt?: number; // UTC
    readonly modifiedAt?: number; // UTC
    readonly isChart?: boolean;
    readonly unplayable?: boolean;
}
