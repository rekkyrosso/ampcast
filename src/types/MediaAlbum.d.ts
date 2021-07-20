import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import Pager from './Pager';

export default interface MediaAlbum extends BaseMediaObject<ItemType.Album> {
    readonly pager: Pager<MediaItem>;
    readonly artist?: string;
    readonly year?: number;
    readonly trackCount?: number;
    readonly duration?: number;
    readonly playedOn?: number;
    readonly unplayable?: boolean;
}
