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
    readonly playedAt?: number; // UTC
    readonly unplayable?: boolean;
    readonly release_mbid?: string;
    readonly artist_mbids?: string[];
}
