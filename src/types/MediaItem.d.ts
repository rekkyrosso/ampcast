import BaseMediaObject from './BaseMediaObject';
import ItemType from './ItemType';
import MediaType from './MediaType';

export default interface MediaItem extends BaseMediaObject<ItemType.Media> {
    readonly mediaType: MediaType;
    readonly duration: number;
    readonly playedAt: number; // UTC
    readonly artists?: readonly string[];
    readonly albumArtist?: string;
    readonly album?: string;
    readonly track?: number;
    readonly year?: number;
    readonly aspectRatio?: number;
    readonly unplayable?: boolean;
    readonly isrc?: string;
    readonly recording_mbid?: string; // MusicBrainz ID
    readonly release_mbid?: string;
    readonly artist_mbids?: string[];
    readonly link?: {
        readonly src: string;
        readonly externalUrl: string;
    };
    readonly blob?: Blob;
}
