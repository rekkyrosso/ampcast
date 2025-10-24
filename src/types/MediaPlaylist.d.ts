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
    readonly playedAt?: number; // unix
    readonly modifiedAt?: number; // unix
    readonly isChart?: boolean;
    readonly unplayable?: boolean;
    readonly editable?: boolean;
    readonly deletable?: boolean;
    readonly items?: {
        readonly deletable?: boolean;
        readonly droppable?: boolean;
        readonly droppableTypes?: readonly string[]; // External types.
        readonly moveable?: boolean;
    };
}
