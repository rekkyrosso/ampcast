import AlbumType from './AlbumType';
import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaItem from './MediaItem';
import Pager from './Pager';

export default interface MediaAlbum extends BaseMediaObject {
    readonly itemType: ItemType.Album;
    readonly pager: Pager<MediaItem>;
    // Everything below here should be optional.
    readonly albumType?: AlbumType;
    readonly artist?: string;
    readonly multiDisc?: boolean;
    readonly year?: number;
    readonly trackCount?: number;
    readonly duration?: number;
    readonly playedAt?: number; // unix
    readonly releasedAt?: number; // unix
    readonly unplayable?: boolean;
    readonly release_mbid?: string;
    readonly artist_mbids?: readonly string[];
    readonly caa_mbid?: string; // cover art archive
    readonly copyright?: string;
    readonly explicit?: boolean;
    readonly badge?: string;
    readonly shareLink?: string;
    readonly subsonic?: {
        readonly isDir?: boolean;
    };
}
