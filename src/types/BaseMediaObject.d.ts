import ItemType from './ItemType';
import Thumbnail from './Thumbnail';

export default interface BaseMediaObject<T extends ItemType> {
    readonly itemType: T;
    readonly src: string;
    readonly title: string;
    readonly addedOn?: number;
    readonly modifiedOn?: number;
    readonly genre?: string;
    readonly mood?: string;
    readonly rating?: number;
    readonly globalRating?: number;
    readonly playCount?: number;
    readonly globalPlayCount?: number;
    readonly externalUrl?: string;
    readonly thumbnails?: Thumbnail[];
    readonly mbid?: string; // MusicBrainz ID
    readonly owner?: {
        readonly name: string;
        readonly url: string;
    };
    readonly apple?: {
        readonly href?: string;
    };
    readonly plex?: {
        readonly ratingKey: string;
    };
}
