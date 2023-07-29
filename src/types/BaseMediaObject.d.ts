import Thumbnail from './Thumbnail';
import UserData from './UserData';

type BaseMediaObject = UserData & {
    readonly src: string;
    readonly title: string;
    // Everything below here should be optional
    readonly externalUrl?: string;
    readonly description?: string;
    readonly addedAt?: number; // unix
    readonly genres?: readonly string[];
    readonly mood?: string;
    readonly thumbnails?: Thumbnail[];
    readonly isOwn?: boolean;
    readonly owner?: {
        readonly name: string;
        readonly url?: string;
    };
    readonly apple?: {
        readonly catalogId: string;
    };
    readonly subsonic?: {
        readonly isDir?: boolean;
    };
};

export default BaseMediaObject;
