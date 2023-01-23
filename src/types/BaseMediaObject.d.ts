import ItemType from './ItemType';
import Thumbnail from './Thumbnail';

export default interface BaseMediaObject<T extends ItemType> {
    readonly itemType: T;
    readonly src: string;
    readonly title: string;
    readonly externalUrl: string;
    readonly addedAt?: number; // unix
    readonly genres?: readonly string[];
    readonly mood?: string;
    readonly rating?: number;
    readonly globalRating?: number;
    readonly playCount?: number;
    readonly globalPlayCount?: number;
    readonly thumbnails?: Thumbnail[];
    readonly isLibraryItem?: boolean;
    readonly owner?: {
        readonly name: string;
        readonly url: string;
    };
    readonly plex?: {
        readonly ratingKey: string;
    };
}
