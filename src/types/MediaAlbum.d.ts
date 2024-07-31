import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import Pager from './Pager';

export default interface MediaAlbum extends BaseMediaObject {
    readonly itemType: ItemType.Album;
    readonly pager: Pager<MediaItem>;
    // Everything below here should be optional.
    readonly artist?: string;
    readonly multiDisc?: boolean;
    readonly year?: number;
    readonly trackCount?: number;
    readonly duration?: number;
    readonly playedAt?: number; // UTC
    readonly unplayable?: boolean;
    readonly synthetic?: boolean; // a fake album (e.g. "Top Tracks")
    readonly release_mbid?: string;
    readonly artist_mbids?: readonly string[];
}
