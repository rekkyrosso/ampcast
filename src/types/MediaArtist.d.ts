import BaseMediaObject from './BaseMediaObject';
import ChildOf from './ChildOf';
import ItemType from './ItemType';
import Pager from './Pager';

export default interface MediaArtist extends BaseMediaObject {
    readonly itemType: ItemType.Artist;
    readonly pager: Pager<ChildOf<MediaArtist>>;
    // Everything below here should be optional.
    readonly artist_mbid?: string;
    readonly origin?: string; // Where the artist is from (or the band was formed).
    readonly countryCode?: string;
    readonly followers?: number;
}
