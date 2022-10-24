import ItemType from './ItemType';
import Thumbnail from './Thumbnail';

export default interface BaseMediaObject<T extends ItemType> {
    readonly itemType: T;
    readonly src: string;
    readonly title: string;
    readonly addedAt?: number; // UTC
    readonly genre?: string;
    readonly mood?: string;
    readonly rating?: number;
    readonly globalRating?: number;
    readonly playCount?: number;
    readonly globalPlayCount?: number;
    readonly externalUrl?: string;
    readonly thumbnails?: Thumbnail[];
    readonly recording_mbid?: string; // MusicBrainz ID
    readonly artist_mbids?: string[];
    readonly release_mbid?: string;
    readonly owner?: {
        readonly name: string;
        readonly url: string;
    };
    readonly plex?: {
        readonly ratingKey: string;
    };
}
