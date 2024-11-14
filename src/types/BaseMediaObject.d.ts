import Thumbnail from './Thumbnail';
import UserData from './UserData';

type BaseMediaObject = UserData & {
    /*
        | `http:*`
        | `https:*`
        | `file:*`
        | `blob:{nanoid}`
        | `{service}:{type}:{id}`
            - service: `MediaServiceId`
            - type: readable string (platform specific). e.g. 'track', 'video', 'album', 'albums', 'playlist'
            - id: unique identifier (platform specific)
    */
    readonly src: string;
    readonly title: string;
    // Everything below here should be optional
    readonly externalUrl?: string;
    readonly description?: string;
    readonly addedAt?: number; // unix
    readonly genres?: readonly string[];
    readonly thumbnails?: readonly Thumbnail[];
    readonly synthetic?: boolean; // Created by ampcast, does not exist as metadata (e.g. "Top Tracks")
    readonly apple?: {
        readonly catalogId: string;
    };
    readonly subsonic?: {
        readonly isDir?: boolean;
    };
};

export default BaseMediaObject;
