import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaAlbum from './MediaAlbum';
import Pager from './Pager';

export default interface MediaArtist extends BaseMediaObject<ItemType.Artist> {
    readonly pager: Pager<MediaAlbum>;
    readonly artist_mbid?: string;
}
