import Auth from './Auth';
import MediaItem from './MediaItem';
import MediaServiceId from './MediaServiceId';
import MediaSource from './MediaSource';
import {Pin} from './Pin';

export default interface MediaService extends Auth {
    readonly id: MediaServiceId;
    readonly name: string;
    readonly icon: MediaServiceId;
    readonly url: string;
    readonly roots: readonly MediaSource[];
    readonly sources: readonly MediaSource[];
    readonly scrobbler?: boolean;
    readonly defaultHidden?: boolean;
    readonly defaultNoScrobble?: boolean;
    createSourceFromPin?: (pin: Pin) => MediaSource<MediaItem>;
    lookup?: (
        artist: string,
        title: string,
        limit?: number,
        timeout?: number
    ) => Promise<readonly MediaItem[]>;
}
